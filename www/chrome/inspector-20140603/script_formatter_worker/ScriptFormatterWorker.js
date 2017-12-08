Object.isEmpty=function(obj)
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
String.prototype.collapseWhitespace=function()
{return this.replace(/[\s\xA0]+/g," ");}
String.prototype.trimMiddle=function(maxLength)
{if(this.length<=maxLength)
return String(this);var leftHalf=maxLength>>1;var rightHalf=maxLength-leftHalf-1;return this.substr(0,leftHalf)+"\u2026"+this.substr(this.length-rightHalf,rightHalf);}
String.prototype.trimEnd=function(maxLength)
{if(this.length<=maxLength)
return String(this);return this.substr(0,maxLength-1)+"\u2026";}
String.prototype.trimURL=function(baseURLDomain)
{var result=this.replace(/^(https|http|file):\/\//i,"");if(baseURLDomain)
result=result.replace(new RegExp("^"+baseURLDomain.escapeForRegExp(),"i"),"");return result;}
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
String.prototype.hashCode=function()
{var result=0;for(var i=0;i<this.length;++i)
result=result*3+this.charCodeAt(i);return result;}
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
{return(Array(4-x.toString().length)).join('0')+x;}
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
result.push(this[i%this.length]);return result;}});Object.defineProperty(Uint32Array.prototype,"sort",{value:Array.prototype.sort});(function(){var partition={value:function(comparator,left,right,pivotIndex)
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
function isDigit(c)
{return!!/[0-9]/.exec(c);}
var index=0;for(var precentIndex=format.indexOf("%",index);precentIndex!==-1;precentIndex=format.indexOf("%",index)){addStringToken(format.substring(index,precentIndex));index=precentIndex+1;if(format[index]==="%"){addStringToken("%");++index;continue;}
if(isDigit(format[index])){var number=parseInt(format.substring(index),10);while(isDigit(format[index]))
++index;if(number>0&&format[index]==="$"){substitutionIndex=(number-1);++index;}}
var precision=-1;if(format[index]==="."){++index;precision=parseInt(format.substring(index),10);if(isNaN(precision))
precision=0;while(isDigit(format[index]))
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
String.format=function(format,substitutions,formatters,initialValue,append)
{if(!format||!substitutions||!substitutions.length)
return{formattedResult:append(initialValue,format),unusedSubstitutions:substitutions};function prettyFunctionName()
{return"String.format(\""+format+"\", \""+substitutions.join("\", \"")+"\")";}
function warn(msg)
{console.warn(prettyFunctionName()+": "+msg);}
function error(msg)
{console.error(prettyFunctionName()+": "+msg);}
var result=initialValue;var tokens=String.tokenizeFormatString(format,formatters);var usedSubstitutionIndexes={};for(var i=0;i<tokens.length;++i){var token=tokens[i];if(token.type==="string"){result=append(result,token.value);continue;}
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
function numberToStringWithSpacesPadding(value,symbolsCount)
{var numberString=value.toString();var paddingLength=Math.max(0,symbolsCount-numberString.length);var paddingString=Array(paddingLength+1).join("\u00a0");return paddingString+numberString;}
var createObjectIdentifier=function()
{return"_"+ ++createObjectIdentifier._last;}
createObjectIdentifier._last=0;var Set=function()
{this._set={};this._size=0;}
Set.fromArray=function(array)
{var result=new Set();array.forEach(function(item){result.add(item);});return result;}
Set.prototype={add:function(item)
{var objectIdentifier=item.__identifier;if(!objectIdentifier){objectIdentifier=createObjectIdentifier();item.__identifier=objectIdentifier;}
if(!this._set[objectIdentifier])
++this._size;this._set[objectIdentifier]=item;},remove:function(item)
{if(this._set[item.__identifier]){--this._size;delete this._set[item.__identifier];return true;}
return false;},values:function()
{var result=new Array(this._size);var i=0;for(var objectIdentifier in this._set)
result[i++]=this._set[objectIdentifier];return result;},contains:function(item)
{return!!this._set[item.__identifier];},size:function()
{return this._size;},clear:function()
{this._set={};this._size=0;}}
var Map=function()
{this._map={};this._size=0;}
Map.prototype={put:function(key,value)
{var objectIdentifier=key.__identifier;if(!objectIdentifier){objectIdentifier=createObjectIdentifier();key.__identifier=objectIdentifier;}
if(!this._map[objectIdentifier])
++this._size;this._map[objectIdentifier]=[key,value];},remove:function(key)
{var result=this._map[key.__identifier];if(!result)
return undefined;--this._size;delete this._map[key.__identifier];return result[1];},keys:function()
{return this._list(0);},values:function()
{return this._list(1);},_list:function(index)
{var result=new Array(this._size);var i=0;for(var objectIdentifier in this._map)
result[i++]=this._map[objectIdentifier][index];return result;},get:function(key)
{var entry=this._map[key.__identifier];return entry?entry[1]:undefined;},contains:function(key)
{var entry=this._map[key.__identifier];return!!entry;},size:function()
{return this._size;},clear:function()
{this._map={};this._size=0;}}
var StringMap=function()
{this._map={};this._size=0;}
StringMap.prototype={put:function(key,value)
{if(key==="__proto__"){if(!this._hasProtoKey){++this._size;this._hasProtoKey=true;}
this._protoValue=value;return;}
if(!Object.prototype.hasOwnProperty.call(this._map,key))
++this._size;this._map[key]=value;},remove:function(key)
{var result;if(key==="__proto__"){if(!this._hasProtoKey)
return undefined;--this._size;delete this._hasProtoKey;result=this._protoValue;delete this._protoValue;return result;}
if(!Object.prototype.hasOwnProperty.call(this._map,key))
return undefined;--this._size;result=this._map[key];delete this._map[key];return result;},keys:function()
{var result=Object.keys(this._map)||[];if(this._hasProtoKey)
result.push("__proto__");return result;},values:function()
{var result=Object.values(this._map);if(this._hasProtoKey)
result.push(this._protoValue);return result;},get:function(key)
{if(key==="__proto__")
return this._protoValue;if(!Object.prototype.hasOwnProperty.call(this._map,key))
return undefined;return this._map[key];},contains:function(key)
{var result;if(key==="__proto__")
return this._hasProtoKey;return Object.prototype.hasOwnProperty.call(this._map,key);},size:function()
{return this._size;},clear:function()
{this._map={};this._size=0;delete this._hasProtoKey;delete this._protoValue;}}
var StringMultimap=function()
{StringMap.call(this);}
StringMultimap.prototype={put:function(key,value)
{if(key==="__proto__"){if(!this._hasProtoKey){++this._size;this._hasProtoKey=true;this._protoValue=new Set();}
this._protoValue.add(value);return;}
if(!Object.prototype.hasOwnProperty.call(this._map,key)){++this._size;this._map[key]=new Set();}
this._map[key].add(value);},get:function(key)
{var result=StringMap.prototype.get.call(this,key);if(!result)
result=new Set();return result;},remove:function(key,value)
{var values=this.get(key);values.remove(value);if(!values.size())
StringMap.prototype.remove.call(this,key)},removeAll:function(key)
{StringMap.prototype.remove.call(this,key);},values:function()
{var result=[];var keys=this.keys();for(var i=0;i<keys.length;++i)
result.pushAll(this.get(keys[i]).values());return result;},__proto__:StringMap.prototype}
var StringSet=function()
{this._map=new StringMap();}
StringSet.fromArray=function(array)
{var result=new StringSet();array.forEach(function(item){result.add(item);});return result;}
StringSet.prototype={add:function(value)
{this._map.put(value,true);},remove:function(value)
{return!!this._map.remove(value);},values:function()
{return this._map.keys();},contains:function(value)
{return this._map.contains(value);},size:function()
{return this._map.size();},clear:function()
{this._map.clear();}}
function loadXHR(url,async,callback)
{function onReadyStateChanged()
{if(xhr.readyState!==XMLHttpRequest.DONE)
return;if(xhr.status===200){callback(xhr.responseText);return;}
callback(null);}
var xhr=new XMLHttpRequest();xhr.open("GET",url,async);if(async)
xhr.onreadystatechange=onReadyStateChanged;xhr.send(null);if(!async){if(xhr.status===200)
return xhr.responseText;return null;}
return null;}
var _importedScripts={};function loadResource(url)
{var xhr=new XMLHttpRequest();xhr.open("GET",url,false);var stack=new Error().stack;try{xhr.send(null);}catch(e){console.error(url+" -> "+stack);throw e;}
return xhr.responseText;}
function importScript(scriptName)
{var sourceURL=self._importScriptPathPrefix+scriptName;if(_importedScripts[sourceURL])
return;_importedScripts[sourceURL]=true;var scriptSource=loadResource(sourceURL);if(!scriptSource)
throw"empty response arrived for script '"+sourceURL+"'";var oldPrefix=self._importScriptPathPrefix;self._importScriptPathPrefix+=scriptName.substring(0,scriptName.lastIndexOf("/")+1);try{self.eval(scriptSource+"\n//# sourceURL="+sourceURL);}finally{self._importScriptPathPrefix=oldPrefix;}}
(function(){var baseUrl=location.origin+location.pathname;self._importScriptPathPrefix=baseUrl.substring(0,baseUrl.lastIndexOf("/")+1);})();var loadScript=importScript;function CallbackBarrier()
{this._pendingIncomingCallbacksCount=0;}
CallbackBarrier.prototype={createCallback:function(userCallback)
{console.assert(!this._outgoingCallback,"CallbackBarrier.createCallback() is called after CallbackBarrier.callWhenDone()");++this._pendingIncomingCallbacksCount;return this._incomingCallback.bind(this,userCallback);},callWhenDone:function(callback)
{console.assert(!this._outgoingCallback,"CallbackBarrier.callWhenDone() is called multiple times");this._outgoingCallback=callback;if(!this._pendingIncomingCallbacksCount)
this._outgoingCallback();},_incomingCallback:function(userCallback)
{console.assert(this._pendingIncomingCallbacksCount>0);if(userCallback){var args=Array.prototype.slice.call(arguments,1);userCallback.apply(null,args);}
if(!--this._pendingIncomingCallbacksCount&&this._outgoingCallback)
this._outgoingCallback();}}
function suppressUnused(value)
{};(function(window){window.CodeMirror={};(function(){"use strict";function splitLines(string){return string.split(/\r?\n|\r/);};function StringStream(string){this.pos=this.start=0;this.string=string;this.lineStart=0;}
StringStream.prototype={eol:function(){return this.pos>=this.string.length;},sol:function(){return this.pos==0;},peek:function(){return this.string.charAt(this.pos)||null;},next:function(){if(this.pos<this.string.length)
return this.string.charAt(this.pos++);},eat:function(match){var ch=this.string.charAt(this.pos);if(typeof match=="string")var ok=ch==match;else var ok=ch&&(match.test?match.test(ch):match(ch));if(ok){++this.pos;return ch;}},eatWhile:function(match){var start=this.pos;while(this.eat(match)){}
return this.pos>start;},eatSpace:function(){var start=this.pos;while(/[\s\u00a0]/.test(this.string.charAt(this.pos)))++this.pos;return this.pos>start;},skipToEnd:function(){this.pos=this.string.length;},skipTo:function(ch){var found=this.string.indexOf(ch,this.pos);if(found>-1){this.pos=found;return true;}},backUp:function(n){this.pos-=n;},column:function(){return this.start-this.lineStart;},indentation:function(){return 0;},match:function(pattern,consume,caseInsensitive){if(typeof pattern=="string"){var cased=function(str){return caseInsensitive?str.toLowerCase():str;};var substr=this.string.substr(this.pos,pattern.length);if(cased(substr)==cased(pattern)){if(consume!==false)this.pos+=pattern.length;return true;}}else{var match=this.string.slice(this.pos).match(pattern);if(match&&match.index>0)return null;if(match&&consume!==false)this.pos+=match[0].length;return match;}},current:function(){return this.string.slice(this.start,this.pos);},hideFirstChars:function(n,inner){this.lineStart+=n;try{return inner();}
finally{this.lineStart-=n;}}};CodeMirror.StringStream=StringStream;CodeMirror.startState=function(mode,a1,a2){return mode.startState?mode.startState(a1,a2):true;};var modes=CodeMirror.modes={},mimeModes=CodeMirror.mimeModes={};CodeMirror.defineMode=function(name,mode){modes[name]=mode;};CodeMirror.defineMIME=function(mime,spec){mimeModes[mime]=spec;};CodeMirror.resolveMode=function(spec){if(typeof spec=="string"&&mimeModes.hasOwnProperty(spec)){spec=mimeModes[spec];}else if(spec&&typeof spec.name=="string"&&mimeModes.hasOwnProperty(spec.name)){spec=mimeModes[spec.name];}
if(typeof spec=="string")return{name:spec};else return spec||{name:"null"};};CodeMirror.getMode=function(options,spec){spec=CodeMirror.resolveMode(spec);var mfactory=modes[spec.name];if(!mfactory)throw new Error("Unknown mode: "+spec);return mfactory(options,spec);};CodeMirror.registerHelper=CodeMirror.registerGlobalHelper=Math.min;CodeMirror.defineMode("null",function(){return{token:function(stream){stream.skipToEnd();}};});CodeMirror.defineMIME("text/plain","null");CodeMirror.runMode=function(string,modespec,callback,options){var mode=CodeMirror.getMode({indentUnit:2},modespec);if(callback.nodeType==1){var tabSize=(options&&options.tabSize)||4;var node=callback,col=0;node.innerHTML="";callback=function(text,style){if(text=="\n"){node.appendChild(document.createElement("br"));col=0;return;}
var content="";for(var pos=0;;){var idx=text.indexOf("\t",pos);if(idx==-1){content+=text.slice(pos);col+=text.length-pos;break;}else{col+=idx-pos;content+=text.slice(pos,idx);var size=tabSize-col%tabSize;col+=size;for(var i=0;i<size;++i)content+=" ";pos=idx+1;}}
if(style){var sp=node.appendChild(document.createElement("span"));sp.className="cm-"+style.replace(/ +/g," cm-");sp.appendChild(document.createTextNode(content));}else{node.appendChild(document.createTextNode(content));}};}
var lines=splitLines(string),state=(options&&options.state)||CodeMirror.startState(mode);for(var i=0,e=lines.length;i<e;++i){if(i)callback("\n");var stream=new CodeMirror.StringStream(lines[i]);while(!stream.eol()){var style=mode.token(stream,state);callback(stream.current(),style,i,stream.start,state);stream.start=stream.pos;}}};})();}(this));CodeMirror.defineMode("css",function(config,parserConfig){"use strict";if(!parserConfig.propertyKeywords)parserConfig=CodeMirror.resolveMode("text/css");var indentUnit=config.indentUnit||config.tabSize||2,hooks=parserConfig.hooks||{},atMediaTypes=parserConfig.atMediaTypes||{},atMediaFeatures=parserConfig.atMediaFeatures||{},propertyKeywords=parserConfig.propertyKeywords||{},colorKeywords=parserConfig.colorKeywords||{},valueKeywords=parserConfig.valueKeywords||{},allowNested=!!parserConfig.allowNested,type=null;function ret(style,tp){type=tp;return style;}
function tokenBase(stream,state){var ch=stream.next();if(hooks[ch]){var result=hooks[ch](stream,state);if(result!==false)return result;}
if(ch=="@"){stream.eatWhile(/[\w\\\-]/);return ret("def",stream.current());}
else if(ch=="=")ret(null,"compare");else if((ch=="~"||ch=="|")&&stream.eat("="))return ret(null,"compare");else if(ch=="\""||ch=="'"){state.tokenize=tokenString(ch);return state.tokenize(stream,state);}
else if(ch=="#"){stream.eatWhile(/[\w\\\-]/);return ret("atom","hash");}
else if(ch=="!"){stream.match(/^\s*\w*/);return ret("keyword","important");}
else if(/\d/.test(ch)||ch=="."&&stream.eat(/\d/)){stream.eatWhile(/[\w.%]/);return ret("number","unit");}
else if(ch==="-"){if(/\d/.test(stream.peek())){stream.eatWhile(/[\w.%]/);return ret("number","unit");}else if(stream.match(/^[^-]+-/)){return ret("meta","meta");}}
else if(/[,+>*\/]/.test(ch)){return ret(null,"select-op");}
else if(ch=="."&&stream.match(/^-?[_a-z][_a-z0-9-]*/i)){return ret("qualifier","qualifier");}
else if(ch==":"){return ret("operator",ch);}
else if(/[;{}\[\]\(\)]/.test(ch)){return ret(null,ch);}
else if(ch=="u"&&stream.match("rl(")){stream.backUp(1);state.tokenize=tokenParenthesized;return ret("property","variable");}
else{stream.eatWhile(/[\w\\\-]/);return ret("property","variable");}}
function tokenString(quote,nonInclusive){return function(stream,state){var escaped=false,ch;while((ch=stream.next())!=null){if(ch==quote&&!escaped)
break;escaped=!escaped&&ch=="\\";}
if(!escaped){if(nonInclusive)stream.backUp(1);state.tokenize=tokenBase;}
return ret("string","string");};}
function tokenParenthesized(stream,state){stream.next();if(!stream.match(/\s*[\"\']/,false))
state.tokenize=tokenString(")",true);else
state.tokenize=tokenBase;return ret(null,"(");}
return{startState:function(base){return{tokenize:tokenBase,baseIndent:base||0,stack:[],lastToken:null};},token:function(stream,state){state.tokenize=state.tokenize||tokenBase;if(state.tokenize==tokenBase&&stream.eatSpace())return null;var style=state.tokenize(stream,state);if(style&&typeof style!="string")style=ret(style[0],style[1]);var context=state.stack[state.stack.length-1];if(style=="variable"){if(type=="variable-definition")state.stack.push("propertyValue");return state.lastToken="variable-2";}else if(style=="property"){var word=stream.current().toLowerCase();if(context=="propertyValue"){if(valueKeywords.hasOwnProperty(word)){style="string-2";}else if(colorKeywords.hasOwnProperty(word)){style="keyword";}else{style="variable-2";}}else if(context=="rule"){if(!propertyKeywords.hasOwnProperty(word)){style+=" error";}}else if(context=="block"){if(propertyKeywords.hasOwnProperty(word)){style="property";}else if(colorKeywords.hasOwnProperty(word)){style="keyword";}else if(valueKeywords.hasOwnProperty(word)){style="string-2";}else{style="tag";}}else if(!context||context=="@media{"){style="tag";}else if(context=="@media"){if(atMediaTypes[stream.current()]){style="attribute";}else if(/^(only|not)$/.test(word)){style="keyword";}else if(word=="and"){style="error";}else if(atMediaFeatures.hasOwnProperty(word)){style="error";}else{style="attribute error";}}else if(context=="@mediaType"){if(atMediaTypes.hasOwnProperty(word)){style="attribute";}else if(word=="and"){style="operator";}else if(/^(only|not)$/.test(word)){style="error";}else{style="error";}}else if(context=="@mediaType("){if(propertyKeywords.hasOwnProperty(word)){}else if(atMediaTypes.hasOwnProperty(word)){style="error";}else if(word=="and"){style="operator";}else if(/^(only|not)$/.test(word)){style="error";}else{style+=" error";}}else if(context=="@import"){style="tag";}else{style="error";}}else if(style=="atom"){if(!context||context=="@media{"||context=="block"){style="builtin";}else if(context=="propertyValue"){if(!/^#([0-9a-fA-f]{3}|[0-9a-fA-f]{6})$/.test(stream.current())){style+=" error";}}else{style="error";}}else if(context=="@media"&&type=="{"){style="error";}
if(type=="{"){if(context=="@media"||context=="@mediaType"){state.stack[state.stack.length-1]="@media{";}
else{var newContext=allowNested?"block":"rule";state.stack.push(newContext);}}
else if(type=="}"){if(context=="interpolation")style="operator";while(state.stack.length){var removed=state.stack.pop();if(removed.indexOf("{")>-1||removed=="block"||removed=="rule"){break;}}}
else if(type=="interpolation")state.stack.push("interpolation");else if(type=="@media")state.stack.push("@media");else if(type=="@import")state.stack.push("@import");else if(context=="@media"&&/\b(keyword|attribute)\b/.test(style))
state.stack[state.stack.length-1]="@mediaType";else if(context=="@mediaType"&&stream.current()==",")
state.stack[state.stack.length-1]="@media";else if(type=="("){if(context=="@media"||context=="@mediaType"){state.stack[state.stack.length-1]="@mediaType";state.stack.push("@mediaType(");}
else state.stack.push("(");}
else if(type==")"){while(state.stack.length){var removed=state.stack.pop();if(removed.indexOf("(")>-1){break;}}}
else if(type==":"&&state.lastToken=="property")state.stack.push("propertyValue");else if(context=="propertyValue"&&type==";")state.stack.pop();else if(context=="@import"&&type==";")state.stack.pop();return state.lastToken=style;},indent:function(state,textAfter){var n=state.stack.length;if(/^\}/.test(textAfter))
n-=state.stack[n-1]=="propertyValue"?2:1;return state.baseIndent+n*indentUnit;},electricChars:"}",blockCommentStart:"/*",blockCommentEnd:"*/",fold:"brace"};});(function(){function keySet(array){var keys={};for(var i=0;i<array.length;++i){keys[array[i]]=true;}
return keys;}
var atMediaTypes=keySet(["all","aural","braille","handheld","print","projection","screen","tty","tv","embossed"]);var atMediaFeatures=keySet(["width","min-width","max-width","height","min-height","max-height","device-width","min-device-width","max-device-width","device-height","min-device-height","max-device-height","aspect-ratio","min-aspect-ratio","max-aspect-ratio","device-aspect-ratio","min-device-aspect-ratio","max-device-aspect-ratio","color","min-color","max-color","color-index","min-color-index","max-color-index","monochrome","min-monochrome","max-monochrome","resolution","min-resolution","max-resolution","scan","grid"]);var propertyKeywords=keySet(["align-content","align-items","align-self","alignment-adjust","alignment-baseline","anchor-point","animation","animation-delay","animation-direction","animation-duration","animation-iteration-count","animation-name","animation-play-state","animation-timing-function","appearance","azimuth","backface-visibility","background","background-attachment","background-clip","background-color","background-image","background-origin","background-position","background-repeat","background-size","baseline-shift","binding","bleed","bookmark-label","bookmark-level","bookmark-state","bookmark-target","border","border-bottom","border-bottom-color","border-bottom-left-radius","border-bottom-right-radius","border-bottom-style","border-bottom-width","border-collapse","border-color","border-image","border-image-outset","border-image-repeat","border-image-slice","border-image-source","border-image-width","border-left","border-left-color","border-left-style","border-left-width","border-radius","border-right","border-right-color","border-right-style","border-right-width","border-spacing","border-style","border-top","border-top-color","border-top-left-radius","border-top-right-radius","border-top-style","border-top-width","border-width","bottom","box-decoration-break","box-shadow","box-sizing","break-after","break-before","break-inside","caption-side","clear","clip","color","color-profile","column-count","column-fill","column-gap","column-rule","column-rule-color","column-rule-style","column-rule-width","column-span","column-width","columns","content","counter-increment","counter-reset","crop","cue","cue-after","cue-before","cursor","direction","display","dominant-baseline","drop-initial-after-adjust","drop-initial-after-align","drop-initial-before-adjust","drop-initial-before-align","drop-initial-size","drop-initial-value","elevation","empty-cells","fit","fit-position","flex","flex-basis","flex-direction","flex-flow","flex-grow","flex-shrink","flex-wrap","float","float-offset","flow-from","flow-into","font","font-feature-settings","font-family","font-kerning","font-language-override","font-size","font-size-adjust","font-stretch","font-style","font-synthesis","font-variant","font-variant-alternates","font-variant-caps","font-variant-east-asian","font-variant-ligatures","font-variant-numeric","font-variant-position","font-weight","grid-cell","grid-column","grid-column-align","grid-column-sizing","grid-column-span","grid-columns","grid-flow","grid-row","grid-row-align","grid-row-sizing","grid-row-span","grid-rows","grid-template","hanging-punctuation","height","hyphens","icon","image-orientation","image-rendering","image-resolution","inline-box-align","justify-content","left","letter-spacing","line-break","line-height","line-stacking","line-stacking-ruby","line-stacking-shift","line-stacking-strategy","list-style","list-style-image","list-style-position","list-style-type","margin","margin-bottom","margin-left","margin-right","margin-top","marker-offset","marks","marquee-direction","marquee-loop","marquee-play-count","marquee-speed","marquee-style","max-height","max-width","min-height","min-width","move-to","nav-down","nav-index","nav-left","nav-right","nav-up","opacity","order","orphans","outline","outline-color","outline-offset","outline-style","outline-width","overflow","overflow-style","overflow-wrap","overflow-x","overflow-y","padding","padding-bottom","padding-left","padding-right","padding-top","page","page-break-after","page-break-before","page-break-inside","page-policy","pause","pause-after","pause-before","perspective","perspective-origin","pitch","pitch-range","play-during","position","presentation-level","punctuation-trim","quotes","region-break-after","region-break-before","region-break-inside","region-fragment","rendering-intent","resize","rest","rest-after","rest-before","richness","right","rotation","rotation-point","ruby-align","ruby-overhang","ruby-position","ruby-span","shape-inside","shape-outside","size","speak","speak-as","speak-header","speak-numeral","speak-punctuation","speech-rate","stress","string-set","tab-size","table-layout","target","target-name","target-new","target-position","text-align","text-align-last","text-decoration","text-decoration-color","text-decoration-line","text-decoration-skip","text-decoration-style","text-emphasis","text-emphasis-color","text-emphasis-position","text-emphasis-style","text-height","text-indent","text-justify","text-outline","text-overflow","text-shadow","text-size-adjust","text-space-collapse","text-transform","text-underline-position","text-wrap","top","transform","transform-origin","transform-style","transition","transition-delay","transition-duration","transition-property","transition-timing-function","unicode-bidi","vertical-align","visibility","voice-balance","voice-duration","voice-family","voice-pitch","voice-range","voice-rate","voice-stress","voice-volume","volume","white-space","widows","width","word-break","word-spacing","word-wrap","z-index","zoom","clip-path","clip-rule","mask","enable-background","filter","flood-color","flood-opacity","lighting-color","stop-color","stop-opacity","pointer-events","color-interpolation","color-interpolation-filters","color-profile","color-rendering","fill","fill-opacity","fill-rule","image-rendering","marker","marker-end","marker-mid","marker-start","shape-rendering","stroke","stroke-dasharray","stroke-dashoffset","stroke-linecap","stroke-linejoin","stroke-miterlimit","stroke-opacity","stroke-width","text-rendering","baseline-shift","dominant-baseline","glyph-orientation-horizontal","glyph-orientation-vertical","kerning","text-anchor","writing-mode"]);var colorKeywords=keySet(["aliceblue","antiquewhite","aqua","aquamarine","azure","beige","bisque","black","blanchedalmond","blue","blueviolet","brown","burlywood","cadetblue","chartreuse","chocolate","coral","cornflowerblue","cornsilk","crimson","cyan","darkblue","darkcyan","darkgoldenrod","darkgray","darkgreen","darkkhaki","darkmagenta","darkolivegreen","darkorange","darkorchid","darkred","darksalmon","darkseagreen","darkslateblue","darkslategray","darkturquoise","darkviolet","deeppink","deepskyblue","dimgray","dodgerblue","firebrick","floralwhite","forestgreen","fuchsia","gainsboro","ghostwhite","gold","goldenrod","gray","grey","green","greenyellow","honeydew","hotpink","indianred","indigo","ivory","khaki","lavender","lavenderblush","lawngreen","lemonchiffon","lightblue","lightcoral","lightcyan","lightgoldenrodyellow","lightgray","lightgreen","lightpink","lightsalmon","lightseagreen","lightskyblue","lightslategray","lightsteelblue","lightyellow","lime","limegreen","linen","magenta","maroon","mediumaquamarine","mediumblue","mediumorchid","mediumpurple","mediumseagreen","mediumslateblue","mediumspringgreen","mediumturquoise","mediumvioletred","midnightblue","mintcream","mistyrose","moccasin","navajowhite","navy","oldlace","olive","olivedrab","orange","orangered","orchid","palegoldenrod","palegreen","paleturquoise","palevioletred","papayawhip","peachpuff","peru","pink","plum","powderblue","purple","red","rosybrown","royalblue","saddlebrown","salmon","sandybrown","seagreen","seashell","sienna","silver","skyblue","slateblue","slategray","snow","springgreen","steelblue","tan","teal","thistle","tomato","turquoise","violet","wheat","white","whitesmoke","yellow","yellowgreen"]);var valueKeywords=keySet(["above","absolute","activeborder","activecaption","afar","after-white-space","ahead","alias","all","all-scroll","alternate","always","amharic","amharic-abegede","antialiased","appworkspace","arabic-indic","armenian","asterisks","auto","avoid","avoid-column","avoid-page","avoid-region","background","backwards","baseline","below","bidi-override","binary","bengali","blink","block","block-axis","bold","bolder","border","border-box","both","bottom","break","break-all","break-word","button","button-bevel","buttonface","buttonhighlight","buttonshadow","buttontext","cambodian","capitalize","caps-lock-indicator","caption","captiontext","caret","cell","center","checkbox","circle","cjk-earthly-branch","cjk-heavenly-stem","cjk-ideographic","clear","clip","close-quote","col-resize","collapse","column","compact","condensed","contain","content","content-box","context-menu","continuous","copy","cover","crop","cross","crosshair","currentcolor","cursive","dashed","decimal","decimal-leading-zero","default","default-button","destination-atop","destination-in","destination-out","destination-over","devanagari","disc","discard","document","dot-dash","dot-dot-dash","dotted","double","down","e-resize","ease","ease-in","ease-in-out","ease-out","element","ellipse","ellipsis","embed","end","ethiopic","ethiopic-abegede","ethiopic-abegede-am-et","ethiopic-abegede-gez","ethiopic-abegede-ti-er","ethiopic-abegede-ti-et","ethiopic-halehame-aa-er","ethiopic-halehame-aa-et","ethiopic-halehame-am-et","ethiopic-halehame-gez","ethiopic-halehame-om-et","ethiopic-halehame-sid-et","ethiopic-halehame-so-et","ethiopic-halehame-ti-er","ethiopic-halehame-ti-et","ethiopic-halehame-tig","ew-resize","expanded","extra-condensed","extra-expanded","fantasy","fast","fill","fixed","flat","footnotes","forwards","from","geometricPrecision","georgian","graytext","groove","gujarati","gurmukhi","hand","hangul","hangul-consonant","hebrew","help","hidden","hide","higher","highlight","highlighttext","hiragana","hiragana-iroha","horizontal","hsl","hsla","icon","ignore","inactiveborder","inactivecaption","inactivecaptiontext","infinite","infobackground","infotext","inherit","initial","inline","inline-axis","inline-block","inline-table","inset","inside","intrinsic","invert","italic","justify","kannada","katakana","katakana-iroha","keep-all","khmer","landscape","lao","large","larger","left","level","lighter","line-through","linear","lines","list-item","listbox","listitem","local","logical","loud","lower","lower-alpha","lower-armenian","lower-greek","lower-hexadecimal","lower-latin","lower-norwegian","lower-roman","lowercase","ltr","malayalam","match","media-controls-background","media-current-time-display","media-fullscreen-button","media-mute-button","media-play-button","media-return-to-realtime-button","media-rewind-button","media-seek-back-button","media-seek-forward-button","media-slider","media-sliderthumb","media-time-remaining-display","media-volume-slider","media-volume-slider-container","media-volume-sliderthumb","medium","menu","menulist","menulist-button","menulist-text","menulist-textfield","menutext","message-box","middle","min-intrinsic","mix","mongolian","monospace","move","multiple","myanmar","n-resize","narrower","ne-resize","nesw-resize","no-close-quote","no-drop","no-open-quote","no-repeat","none","normal","not-allowed","nowrap","ns-resize","nw-resize","nwse-resize","oblique","octal","open-quote","optimizeLegibility","optimizeSpeed","oriya","oromo","outset","outside","outside-shape","overlay","overline","padding","padding-box","painted","page","paused","persian","plus-darker","plus-lighter","pointer","polygon","portrait","pre","pre-line","pre-wrap","preserve-3d","progress","push-button","radio","read-only","read-write","read-write-plaintext-only","rectangle","region","relative","repeat","repeat-x","repeat-y","reset","reverse","rgb","rgba","ridge","right","round","row-resize","rtl","run-in","running","s-resize","sans-serif","scroll","scrollbar","se-resize","searchfield","searchfield-cancel-button","searchfield-decoration","searchfield-results-button","searchfield-results-decoration","semi-condensed","semi-expanded","separate","serif","show","sidama","single","skip-white-space","slide","slider-horizontal","slider-vertical","sliderthumb-horizontal","sliderthumb-vertical","slow","small","small-caps","small-caption","smaller","solid","somali","source-atop","source-in","source-out","source-over","space","square","square-button","start","static","status-bar","stretch","stroke","sub","subpixel-antialiased","super","sw-resize","table","table-caption","table-cell","table-column","table-column-group","table-footer-group","table-header-group","table-row","table-row-group","telugu","text","text-bottom","text-top","textarea","textfield","thai","thick","thin","threeddarkshadow","threedface","threedhighlight","threedlightshadow","threedshadow","tibetan","tigre","tigrinya-er","tigrinya-er-abegede","tigrinya-et","tigrinya-et-abegede","to","top","transparent","ultra-condensed","ultra-expanded","underline","up","upper-alpha","upper-armenian","upper-greek","upper-hexadecimal","upper-latin","upper-norwegian","upper-roman","uppercase","urdu","url","vertical","vertical-text","visible","visibleFill","visiblePainted","visibleStroke","visual","w-resize","wait","wave","wider","window","windowframe","windowtext","x-large","x-small","xor","xx-large","xx-small"]);function tokenCComment(stream,state){var maybeEnd=false,ch;while((ch=stream.next())!=null){if(maybeEnd&&ch=="/"){state.tokenize=null;break;}
maybeEnd=(ch=="*");}
return["comment","comment"];}
CodeMirror.defineMIME("text/css",{atMediaTypes:atMediaTypes,atMediaFeatures:atMediaFeatures,propertyKeywords:propertyKeywords,colorKeywords:colorKeywords,valueKeywords:valueKeywords,hooks:{"<":function(stream,state){function tokenSGMLComment(stream,state){var dashes=0,ch;while((ch=stream.next())!=null){if(dashes>=2&&ch==">"){state.tokenize=null;break;}
dashes=(ch=="-")?dashes+1:0;}
return["comment","comment"];}
if(stream.eat("!")){state.tokenize=tokenSGMLComment;return tokenSGMLComment(stream,state);}},"/":function(stream,state){if(stream.eat("*")){state.tokenize=tokenCComment;return tokenCComment(stream,state);}
return false;}},name:"css"});CodeMirror.defineMIME("text/x-scss",{atMediaTypes:atMediaTypes,atMediaFeatures:atMediaFeatures,propertyKeywords:propertyKeywords,colorKeywords:colorKeywords,valueKeywords:valueKeywords,allowNested:true,hooks:{":":function(stream){if(stream.match(/\s*{/)){return[null,"{"];}
return false;},"$":function(stream){stream.match(/^[\w-]+/);if(stream.peek()==":"){return["variable","variable-definition"];}
return["variable","variable"];},",":function(stream,state){if(state.stack[state.stack.length-1]=="propertyValue"&&stream.match(/^ *\$/,false)){return["operator",";"];}},"/":function(stream,state){if(stream.eat("/")){stream.skipToEnd();return["comment","comment"];}else if(stream.eat("*")){state.tokenize=tokenCComment;return tokenCComment(stream,state);}else{return["operator","operator"];}},"#":function(stream){if(stream.eat("{")){return["operator","interpolation"];}else{stream.eatWhile(/[\w\\\-]/);return["atom","hash"];}}},name:"css"});})();;CodeMirror.defineMode("javascript",function(config,parserConfig){var indentUnit=config.indentUnit;var statementIndent=parserConfig.statementIndent;var jsonMode=parserConfig.json;var isTS=parserConfig.typescript;var keywords=function(){function kw(type){return{type:type,style:"keyword"};}
var A=kw("keyword a"),B=kw("keyword b"),C=kw("keyword c");var operator=kw("operator"),atom={type:"atom",style:"atom"};var jsKeywords={"if":kw("if"),"while":A,"with":A,"else":B,"do":B,"try":B,"finally":B,"return":C,"break":C,"continue":C,"new":C,"delete":C,"throw":C,"var":kw("var"),"const":kw("var"),"let":kw("var"),"function":kw("function"),"catch":kw("catch"),"for":kw("for"),"switch":kw("switch"),"case":kw("case"),"default":kw("default"),"in":operator,"typeof":operator,"instanceof":operator,"true":atom,"false":atom,"null":atom,"undefined":atom,"NaN":atom,"Infinity":atom,"this":kw("this"),"module":kw("module"),"class":kw("class"),"super":kw("atom"),"yield":C,"export":kw("export"),"import":kw("import"),"extends":C};if(isTS){var type={type:"variable",style:"variable-3"};var tsKeywords={"interface":kw("interface"),"extends":kw("extends"),"constructor":kw("constructor"),"public":kw("public"),"private":kw("private"),"protected":kw("protected"),"static":kw("static"),"string":type,"number":type,"bool":type,"any":type};for(var attr in tsKeywords){jsKeywords[attr]=tsKeywords[attr];}}
return jsKeywords;}();var isOperatorChar=/[+\-*&%=<>!?|~^]/;function nextUntilUnescaped(stream,end){var escaped=false,next;while((next=stream.next())!=null){if(next==end&&!escaped)
return false;escaped=!escaped&&next=="\\";}
return escaped;}
var type,content;function ret(tp,style,cont){type=tp;content=cont;return style;}
function tokenBase(stream,state){var ch=stream.next();if(ch=='"'||ch=="'"){state.tokenize=tokenString(ch);return state.tokenize(stream,state);}else if(ch=="."&&stream.match(/^\d+(?:[eE][+\-]?\d+)?/)){return ret("number","number");}else if(ch=="."&&stream.match("..")){return ret("spread","meta");}else if(/[\[\]{}\(\),;\:\.]/.test(ch)){return ret(ch);}else if(ch=="="&&stream.eat(">")){return ret("=>");}else if(ch=="0"&&stream.eat(/x/i)){stream.eatWhile(/[\da-f]/i);return ret("number","number");}else if(/\d/.test(ch)){stream.match(/^\d*(?:\.\d*)?(?:[eE][+\-]?\d+)?/);return ret("number","number");}else if(ch=="/"){if(stream.eat("*")){state.tokenize=tokenComment;return tokenComment(stream,state);}else if(stream.eat("/")){stream.skipToEnd();return ret("comment","comment");}else if(state.lastType=="operator"||state.lastType=="keyword c"||state.lastType=="sof"||/^[\[{}\(,;:]$/.test(state.lastType)){nextUntilUnescaped(stream,"/");stream.eatWhile(/[gimy]/);return ret("regexp","string-2");}else{stream.eatWhile(isOperatorChar);return ret("operator",null,stream.current());}}else if(ch=="`"){state.tokenize=tokenQuasi;return tokenQuasi(stream,state);}else if(ch=="#"){stream.skipToEnd();return ret("error","error");}else if(isOperatorChar.test(ch)){stream.eatWhile(isOperatorChar);return ret("operator",null,stream.current());}else{stream.eatWhile(/[\w\$_]/);var word=stream.current(),known=keywords.propertyIsEnumerable(word)&&keywords[word];return(known&&state.lastType!=".")?ret(known.type,known.style,word):ret("variable","variable",word);}}
function tokenString(quote){return function(stream,state){if(!nextUntilUnescaped(stream,quote))
state.tokenize=tokenBase;return ret("string","string");};}
function tokenComment(stream,state){var maybeEnd=false,ch;while(ch=stream.next()){if(ch=="/"&&maybeEnd){state.tokenize=tokenBase;break;}
maybeEnd=(ch=="*");}
return ret("comment","comment");}
function tokenQuasi(stream,state){var escaped=false,next;while((next=stream.next())!=null){if(!escaped&&(next=="`"||next=="$"&&stream.eat("{"))){state.tokenize=tokenBase;break;}
escaped=!escaped&&next=="\\";}
return ret("quasi","string-2",stream.current());}
var brackets="([{}])";function findFatArrow(stream,state){if(state.fatArrowAt)state.fatArrowAt=null;var arrow=stream.string.indexOf("=>",stream.start);if(arrow<0)return;var depth=0,sawSomething=false;for(var pos=arrow-1;pos>=0;--pos){var ch=stream.string.charAt(pos);var bracket=brackets.indexOf(ch);if(bracket>=0&&bracket<3){if(!depth){++pos;break;}
if(--depth==0)break;}else if(bracket>=3&&bracket<6){++depth;}else if(/[$\w]/.test(ch)){sawSomething=true;}else if(sawSomething&&!depth){++pos;break;}}
if(sawSomething&&!depth)state.fatArrowAt=pos;}
var atomicTypes={"atom":true,"number":true,"variable":true,"string":true,"regexp":true,"this":true};function JSLexical(indented,column,type,align,prev,info){this.indented=indented;this.column=column;this.type=type;this.prev=prev;this.info=info;if(align!=null)this.align=align;}
function inScope(state,varname){for(var v=state.localVars;v;v=v.next)
if(v.name==varname)return true;for(var cx=state.context;cx;cx=cx.prev){for(var v=cx.vars;v;v=v.next)
if(v.name==varname)return true;}}
function parseJS(state,style,type,content,stream){var cc=state.cc;cx.state=state;cx.stream=stream;cx.marked=null,cx.cc=cc;if(!state.lexical.hasOwnProperty("align"))
state.lexical.align=true;while(true){var combinator=cc.length?cc.pop():jsonMode?expression:statement;if(combinator(type,content)){while(cc.length&&cc[cc.length-1].lex)
cc.pop()();if(cx.marked)return cx.marked;if(type=="variable"&&inScope(state,content))return"variable-2";return style;}}}
var cx={state:null,column:null,marked:null,cc:null};function pass(){for(var i=arguments.length-1;i>=0;i--)cx.cc.push(arguments[i]);}
function cont(){pass.apply(null,arguments);return true;}
function register(varname){function inList(list){for(var v=list;v;v=v.next)
if(v.name==varname)return true;return false;}
var state=cx.state;if(state.context){cx.marked="def";if(inList(state.localVars))return;state.localVars={name:varname,next:state.localVars};}else{if(inList(state.globalVars))return;if(parserConfig.globalVars)
state.globalVars={name:varname,next:state.globalVars};}}
var defaultVars={name:"this",next:{name:"arguments"}};function pushcontext(){cx.state.context={prev:cx.state.context,vars:cx.state.localVars};cx.state.localVars=defaultVars;}
function popcontext(){cx.state.localVars=cx.state.context.vars;cx.state.context=cx.state.context.prev;}
function pushlex(type,info){var result=function(){var state=cx.state,indent=state.indented;if(state.lexical.type=="stat")indent=state.lexical.indented;state.lexical=new JSLexical(indent,cx.stream.column(),type,null,state.lexical,info);};result.lex=true;return result;}
function poplex(){var state=cx.state;if(state.lexical.prev){if(state.lexical.type==")")
state.indented=state.lexical.indented;state.lexical=state.lexical.prev;}}
poplex.lex=true;function expect(wanted){return function(type){if(type==wanted)return cont();else if(wanted==";")return pass();else return cont(arguments.callee);};}
function statement(type,value){if(type=="var")return cont(pushlex("vardef",value.length),vardef,expect(";"),poplex);if(type=="keyword a")return cont(pushlex("form"),expression,statement,poplex);if(type=="keyword b")return cont(pushlex("form"),statement,poplex);if(type=="{")return cont(pushlex("}"),block,poplex);if(type==";")return cont();if(type=="if")return cont(pushlex("form"),expression,statement,poplex,maybeelse);if(type=="function")return cont(functiondef);if(type=="for")return cont(pushlex("form"),forspec,poplex,statement,poplex);if(type=="variable")return cont(pushlex("stat"),maybelabel);if(type=="switch")return cont(pushlex("form"),expression,pushlex("}","switch"),expect("{"),block,poplex,poplex);if(type=="case")return cont(expression,expect(":"));if(type=="default")return cont(expect(":"));if(type=="catch")return cont(pushlex("form"),pushcontext,expect("("),funarg,expect(")"),statement,poplex,popcontext);if(type=="module")return cont(pushlex("form"),pushcontext,afterModule,popcontext,poplex);if(type=="class")return cont(pushlex("form"),className,objlit,poplex);if(type=="export")return cont(pushlex("form"),afterExport,poplex);if(type=="import")return cont(pushlex("form"),afterImport,poplex);return pass(pushlex("stat"),expression,expect(";"),poplex);}
function expression(type){return expressionInner(type,false);}
function expressionNoComma(type){return expressionInner(type,true);}
function expressionInner(type,noComma){if(cx.state.fatArrowAt==cx.stream.start){var body=noComma?arrowBodyNoComma:arrowBody;if(type=="(")return cont(pushcontext,commasep(pattern,")"),expect("=>"),body,popcontext);else if(type=="variable")return pass(pushcontext,pattern,expect("=>"),body,popcontext);}
var maybeop=noComma?maybeoperatorNoComma:maybeoperatorComma;if(atomicTypes.hasOwnProperty(type))return cont(maybeop);if(type=="function")return cont(functiondef);if(type=="keyword c")return cont(noComma?maybeexpressionNoComma:maybeexpression);if(type=="(")return cont(pushlex(")"),maybeexpression,comprehension,expect(")"),poplex,maybeop);if(type=="operator"||type=="spread")return cont(noComma?expressionNoComma:expression);if(type=="[")return cont(pushlex("]"),expressionNoComma,maybeArrayComprehension,poplex,maybeop);if(type=="{")return cont(commasep(objprop,"}"),maybeop);return cont();}
function maybeexpression(type){if(type.match(/[;\}\)\],]/))return pass();return pass(expression);}
function maybeexpressionNoComma(type){if(type.match(/[;\}\)\],]/))return pass();return pass(expressionNoComma);}
function maybeoperatorComma(type,value){if(type==",")return cont(expression);return maybeoperatorNoComma(type,value,false);}
function maybeoperatorNoComma(type,value,noComma){var me=noComma==false?maybeoperatorComma:maybeoperatorNoComma;var expr=noComma==false?expression:expressionNoComma;if(value=="=>")return cont(pushcontext,noComma?arrowBodyNoComma:arrowBody,popcontext);if(type=="operator"){if(/\+\+|--/.test(value))return cont(me);if(value=="?")return cont(expression,expect(":"),expr);return cont(expr);}
if(type=="quasi"){cx.cc.push(me);return quasi(value);}
if(type==";")return;if(type=="(")return cont(commasep(expressionNoComma,")","call"),me);if(type==".")return cont(property,me);if(type=="[")return cont(pushlex("]"),maybeexpression,expect("]"),poplex,me);}
function quasi(value){if(!value)debugger;if(value.slice(value.length-2)!="${")return cont();return cont(expression,continueQuasi);}
function continueQuasi(type){if(type=="}"){cx.marked="string-2";cx.state.tokenize=tokenQuasi;return cont();}}
function arrowBody(type){findFatArrow(cx.stream,cx.state);if(type=="{")return pass(statement);return pass(expression);}
function arrowBodyNoComma(type){findFatArrow(cx.stream,cx.state);if(type=="{")return pass(statement);return pass(expressionNoComma);}
function maybelabel(type){if(type==":")return cont(poplex,statement);return pass(maybeoperatorComma,expect(";"),poplex);}
function property(type){if(type=="variable"){cx.marked="property";return cont();}}
function objprop(type,value){if(type=="variable"){cx.marked="property";if(value=="get"||value=="set")return cont(getterSetter);}else if(type=="number"||type=="string"){cx.marked=type+" property";}else if(type=="["){return cont(expression,expect("]"),afterprop);}
if(atomicTypes.hasOwnProperty(type))return cont(afterprop);}
function getterSetter(type){if(type!="variable")return pass(afterprop);cx.marked="property";return cont(functiondef);}
function afterprop(type){if(type==":")return cont(expressionNoComma);if(type=="(")return pass(functiondef);}
function commasep(what,end,info){function proceed(type){if(type==","){var lex=cx.state.lexical;if(lex.info=="call")lex.pos=(lex.pos||0)+1;return cont(what,proceed);}
if(type==end)return cont();return cont(expect(end));}
return function(type){if(type==end)return cont();if(info===false)return pass(what,proceed);return pass(pushlex(end,info),what,proceed,poplex);};}
function block(type){if(type=="}")return cont();return pass(statement,block);}
function maybetype(type){if(isTS&&type==":")return cont(typedef);}
function typedef(type){if(type=="variable"){cx.marked="variable-3";return cont();}}
function vardef(){return pass(pattern,maybetype,maybeAssign,vardefCont);}
function pattern(type,value){if(type=="variable"){register(value);return cont();}
if(type=="[")return cont(commasep(pattern,"]"));if(type=="{")return cont(commasep(proppattern,"}"));}
function proppattern(type,value){if(type=="variable"&&!cx.stream.match(/^\s*:/,false)){register(value);return cont(maybeAssign);}
if(type=="variable")cx.marked="property";return cont(expect(":"),pattern,maybeAssign);}
function maybeAssign(_type,value){if(value=="=")return cont(expressionNoComma);}
function vardefCont(type){if(type==",")return cont(vardef);}
function maybeelse(type,value){if(type=="keyword b"&&value=="else")return cont(pushlex("form"),statement,poplex);}
function forspec(type){if(type=="(")return cont(pushlex(")"),forspec1,expect(")"));}
function forspec1(type){if(type=="var")return cont(vardef,expect(";"),forspec2);if(type==";")return cont(forspec2);if(type=="variable")return cont(formaybeinof);return pass(expression,expect(";"),forspec2);}
function formaybeinof(_type,value){if(value=="in"||value=="of"){cx.marked="keyword";return cont(expression);}
return cont(maybeoperatorComma,forspec2);}
function forspec2(type,value){if(type==";")return cont(forspec3);if(value=="in"||value=="of"){cx.marked="keyword";return cont(expression);}
return pass(expression,expect(";"),forspec3);}
function forspec3(type){if(type!=")")cont(expression);}
function functiondef(type,value){if(value=="*"){cx.marked="keyword";return cont(functiondef);}
if(type=="variable"){register(value);return cont(functiondef);}
if(type=="(")return cont(pushcontext,commasep(funarg,")"),statement,popcontext);}
function funarg(type){if(type=="spread")return cont(funarg);return pass(pattern,maybetype);}
function className(type,value){if(type=="variable"){register(value);return cont(classNameAfter);}}
function classNameAfter(_type,value){if(value=="extends")return cont(expression);}
function objlit(type){if(type=="{")return cont(commasep(objprop,"}"));}
function afterModule(type,value){if(type=="string")return cont(statement);if(type=="variable"){register(value);return cont(maybeFrom);}}
function afterExport(_type,value){if(value=="*"){cx.marked="keyword";return cont(maybeFrom,expect(";"));}
if(value=="default"){cx.marked="keyword";return cont(expression,expect(";"));}
return pass(statement);}
function afterImport(type){if(type=="string")return cont();return pass(importSpec,maybeFrom);}
function importSpec(type,value){if(type=="{")return cont(commasep(importSpec,"}"));if(type=="variable")register(value);return cont();}
function maybeFrom(_type,value){if(value=="from"){cx.marked="keyword";return cont(expression);}}
function maybeArrayComprehension(type){if(type=="for")return pass(comprehension);if(type==",")return cont(commasep(expressionNoComma,"]",false));return pass(commasep(expressionNoComma,"]",false));}
function comprehension(type){if(type=="for")return cont(forspec,comprehension);if(type=="if")return cont(expression,comprehension);}
return{startState:function(basecolumn){var state={tokenize:tokenBase,lastType:"sof",cc:[],lexical:new JSLexical((basecolumn||0)-indentUnit,0,"block",false),localVars:parserConfig.localVars,context:parserConfig.localVars&&{vars:parserConfig.localVars},indented:0};if(parserConfig.globalVars)state.globalVars=parserConfig.globalVars;return state;},token:function(stream,state){if(stream.sol()){if(!state.lexical.hasOwnProperty("align"))
state.lexical.align=false;state.indented=stream.indentation();findFatArrow(stream,state);}
if(state.tokenize!=tokenComment&&stream.eatSpace())return null;var style=state.tokenize(stream,state);if(type=="comment")return style;state.lastType=type=="operator"&&(content=="++"||content=="--")?"incdec":type;return parseJS(state,style,type,content,stream);},indent:function(state,textAfter){if(state.tokenize==tokenComment)return CodeMirror.Pass;if(state.tokenize!=tokenBase)return 0;var firstChar=textAfter&&textAfter.charAt(0),lexical=state.lexical;for(var i=state.cc.length-1;i>=0;--i){var c=state.cc[i];if(c==poplex)lexical=lexical.prev;else if(c!=maybeelse)break;}
if(lexical.type=="stat"&&firstChar=="}")lexical=lexical.prev;if(statementIndent&&lexical.type==")"&&lexical.prev.type=="stat")
lexical=lexical.prev;var type=lexical.type,closing=firstChar==type;if(type=="vardef")return lexical.indented+(state.lastType=="operator"||state.lastType==","?lexical.info+1:0);else if(type=="form"&&firstChar=="{")return lexical.indented;else if(type=="form")return lexical.indented+indentUnit;else if(type=="stat")
return lexical.indented+(state.lastType=="operator"||state.lastType==","?statementIndent||indentUnit:0);else if(lexical.info=="switch"&&!closing&&parserConfig.doubleIndentSwitch!=false)
return lexical.indented+(/^(?:case|default)\b/.test(textAfter)?indentUnit:2*indentUnit);else if(lexical.align)return lexical.column+(closing?0:1);else return lexical.indented+(closing?0:indentUnit);},electricChars:":{}",blockCommentStart:jsonMode?null:"/*",blockCommentEnd:jsonMode?null:"*/",lineComment:jsonMode?null:"//",fold:"brace",helperType:jsonMode?"json":"javascript",jsonMode:jsonMode};});CodeMirror.defineMIME("text/javascript","javascript");CodeMirror.defineMIME("text/ecmascript","javascript");CodeMirror.defineMIME("application/javascript","javascript");CodeMirror.defineMIME("application/ecmascript","javascript");CodeMirror.defineMIME("application/json",{name:"javascript",json:true});CodeMirror.defineMIME("application/x-json",{name:"javascript",json:true});CodeMirror.defineMIME("text/typescript",{name:"javascript",typescript:true});CodeMirror.defineMIME("application/typescript",{name:"javascript",typescript:true});;CodeMirror.defineMode("xml",function(config,parserConfig){var indentUnit=config.indentUnit;var multilineTagIndentFactor=parserConfig.multilineTagIndentFactor||1;var multilineTagIndentPastTag=parserConfig.multilineTagIndentPastTag||true;var Kludges=parserConfig.htmlMode?{autoSelfClosers:{'area':true,'base':true,'br':true,'col':true,'command':true,'embed':true,'frame':true,'hr':true,'img':true,'input':true,'keygen':true,'link':true,'meta':true,'param':true,'source':true,'track':true,'wbr':true},implicitlyClosed:{'dd':true,'li':true,'optgroup':true,'option':true,'p':true,'rp':true,'rt':true,'tbody':true,'td':true,'tfoot':true,'th':true,'tr':true},contextGrabbers:{'dd':{'dd':true,'dt':true},'dt':{'dd':true,'dt':true},'li':{'li':true},'option':{'option':true,'optgroup':true},'optgroup':{'optgroup':true},'p':{'address':true,'article':true,'aside':true,'blockquote':true,'dir':true,'div':true,'dl':true,'fieldset':true,'footer':true,'form':true,'h1':true,'h2':true,'h3':true,'h4':true,'h5':true,'h6':true,'header':true,'hgroup':true,'hr':true,'menu':true,'nav':true,'ol':true,'p':true,'pre':true,'section':true,'table':true,'ul':true},'rp':{'rp':true,'rt':true},'rt':{'rp':true,'rt':true},'tbody':{'tbody':true,'tfoot':true},'td':{'td':true,'th':true},'tfoot':{'tbody':true},'th':{'td':true,'th':true},'thead':{'tbody':true,'tfoot':true},'tr':{'tr':true}},doNotIndent:{"pre":true},allowUnquoted:true,allowMissing:true}:{autoSelfClosers:{},implicitlyClosed:{},contextGrabbers:{},doNotIndent:{},allowUnquoted:false,allowMissing:false};var alignCDATA=parserConfig.alignCDATA;var tagName,type;function inText(stream,state){function chain(parser){state.tokenize=parser;return parser(stream,state);}
var ch=stream.next();if(ch=="<"){if(stream.eat("!")){if(stream.eat("[")){if(stream.match("CDATA["))return chain(inBlock("atom","]]>"));else return null;}else if(stream.match("--")){return chain(inBlock("comment","-->"));}else if(stream.match("DOCTYPE",true,true)){stream.eatWhile(/[\w\._\-]/);return chain(doctype(1));}else{return null;}}else if(stream.eat("?")){stream.eatWhile(/[\w\._\-]/);state.tokenize=inBlock("meta","?>");return"meta";}else{var isClose=stream.eat("/");tagName="";var c;while((c=stream.eat(/[^\s\u00a0=<>\"\'\/?]/)))tagName+=c;if(!tagName)return"tag error";type=isClose?"closeTag":"openTag";state.tokenize=inTag;return"tag";}}else if(ch=="&"){var ok;if(stream.eat("#")){if(stream.eat("x")){ok=stream.eatWhile(/[a-fA-F\d]/)&&stream.eat(";");}else{ok=stream.eatWhile(/[\d]/)&&stream.eat(";");}}else{ok=stream.eatWhile(/[\w\.\-:]/)&&stream.eat(";");}
return ok?"atom":"error";}else{stream.eatWhile(/[^&<]/);return null;}}
function inTag(stream,state){var ch=stream.next();if(ch==">"||(ch=="/"&&stream.eat(">"))){state.tokenize=inText;type=ch==">"?"endTag":"selfcloseTag";return"tag";}else if(ch=="="){type="equals";return null;}else if(ch=="<"){state.tokenize=inText;var next=state.tokenize(stream,state);return next?next+" error":"error";}else if(/[\'\"]/.test(ch)){state.tokenize=inAttribute(ch);state.stringStartCol=stream.column();return state.tokenize(stream,state);}else{stream.eatWhile(/[^\s\u00a0=<>\"\']/);return"word";}}
function inAttribute(quote){var closure=function(stream,state){while(!stream.eol()){if(stream.next()==quote){state.tokenize=inTag;break;}}
return"string";};closure.isInAttribute=true;return closure;}
function inBlock(style,terminator){return function(stream,state){while(!stream.eol()){if(stream.match(terminator)){state.tokenize=inText;break;}
stream.next();}
return style;};}
function doctype(depth){return function(stream,state){var ch;while((ch=stream.next())!=null){if(ch=="<"){state.tokenize=doctype(depth+1);return state.tokenize(stream,state);}else if(ch==">"){if(depth==1){state.tokenize=inText;break;}else{state.tokenize=doctype(depth-1);return state.tokenize(stream,state);}}}
return"meta";};}
var curState,curStream,setStyle;function pass(){for(var i=arguments.length-1;i>=0;i--)curState.cc.push(arguments[i]);}
function cont(){pass.apply(null,arguments);return true;}
function pushContext(tagName,startOfLine){var noIndent=Kludges.doNotIndent.hasOwnProperty(tagName)||(curState.context&&curState.context.noIndent);curState.context={prev:curState.context,tagName:tagName,indent:curState.indented,startOfLine:startOfLine,noIndent:noIndent};}
function popContext(){if(curState.context)curState.context=curState.context.prev;}
function element(type){if(type=="openTag"){curState.tagName=tagName;curState.tagStart=curStream.column();return cont(attributes,endtag(curState.startOfLine));}else if(type=="closeTag"){var err=false;if(curState.context){if(curState.context.tagName!=tagName){if(Kludges.implicitlyClosed.hasOwnProperty(curState.context.tagName.toLowerCase())){popContext();}
err=!curState.context||curState.context.tagName!=tagName;}}else{err=true;}
if(err)setStyle="error";return cont(endclosetag(err));}
return cont();}
function endtag(startOfLine){return function(type){var tagName=curState.tagName;curState.tagName=curState.tagStart=null;if(type=="selfcloseTag"||(type=="endTag"&&Kludges.autoSelfClosers.hasOwnProperty(tagName.toLowerCase()))){maybePopContext(tagName.toLowerCase());return cont();}
if(type=="endTag"){maybePopContext(tagName.toLowerCase());pushContext(tagName,startOfLine);return cont();}
return cont();};}
function endclosetag(err){return function(type){if(err)setStyle="error";if(type=="endTag"){popContext();return cont();}
setStyle="error";return cont(arguments.callee);};}
function maybePopContext(nextTagName){var parentTagName;while(true){if(!curState.context){return;}
parentTagName=curState.context.tagName.toLowerCase();if(!Kludges.contextGrabbers.hasOwnProperty(parentTagName)||!Kludges.contextGrabbers[parentTagName].hasOwnProperty(nextTagName)){return;}
popContext();}}
function attributes(type){if(type=="word"){setStyle="attribute";return cont(attribute,attributes);}
if(type=="endTag"||type=="selfcloseTag")return pass();setStyle="error";return cont(attributes);}
function attribute(type){if(type=="equals")return cont(attvalue,attributes);if(!Kludges.allowMissing)setStyle="error";else if(type=="word"){setStyle="attribute";return cont(attribute,attributes);}
return(type=="endTag"||type=="selfcloseTag")?pass():cont();}
function attvalue(type){if(type=="string")return cont(attvaluemaybe);if(type=="word"&&Kludges.allowUnquoted){setStyle="string";return cont();}
setStyle="error";return(type=="endTag"||type=="selfCloseTag")?pass():cont();}
function attvaluemaybe(type){if(type=="string")return cont(attvaluemaybe);else return pass();}
return{startState:function(){return{tokenize:inText,cc:[],indented:0,startOfLine:true,tagName:null,tagStart:null,context:null};},token:function(stream,state){if(!state.tagName&&stream.sol()){state.startOfLine=true;state.indented=stream.indentation();}
if(stream.eatSpace())return null;setStyle=type=tagName=null;var style=state.tokenize(stream,state);state.type=type;if((style||type)&&style!="comment"){curState=state;curStream=stream;while(true){var comb=state.cc.pop()||element;if(comb(type||style))break;}}
state.startOfLine=false;if(setStyle)
style=setStyle=="error"?style+" error":setStyle;return style;},indent:function(state,textAfter,fullLine){var context=state.context;if(state.tokenize.isInAttribute){return state.stringStartCol+1;}
if((state.tokenize!=inTag&&state.tokenize!=inText)||context&&context.noIndent)
return fullLine?fullLine.match(/^(\s*)/)[0].length:0;if(state.tagName){if(multilineTagIndentPastTag)
return state.tagStart+state.tagName.length+2;else
return state.tagStart+indentUnit*multilineTagIndentFactor;}
if(alignCDATA&&/<!\[CDATA\[/.test(textAfter))return 0;if(context&&/^<\//.test(textAfter))
context=context.prev;while(context&&!context.startOfLine)
context=context.prev;if(context)return context.indent+indentUnit;else return 0;},electricChars:"/",blockCommentStart:"<!--",blockCommentEnd:"-->",configuration:parserConfig.htmlMode?"html":"xml",helperType:parserConfig.htmlMode?"html":"xml"};});CodeMirror.defineMIME("text/xml","xml");CodeMirror.defineMIME("application/xml","xml");if(!CodeMirror.mimeModes.hasOwnProperty("text/html"))
CodeMirror.defineMIME("text/html",{name:"xml",htmlMode:true});;CodeMirror.defineMode("htmlmixed",function(config,parserConfig){var htmlMode=CodeMirror.getMode(config,{name:"xml",htmlMode:true});var cssMode=CodeMirror.getMode(config,"css");var scriptTypes=[],scriptTypesConf=parserConfig&&parserConfig.scriptTypes;scriptTypes.push({matches:/^(?:text|application)\/(?:x-)?(?:java|ecma)script$|^$/i,mode:CodeMirror.getMode(config,"javascript")});if(scriptTypesConf)for(var i=0;i<scriptTypesConf.length;++i){var conf=scriptTypesConf[i];scriptTypes.push({matches:conf.matches,mode:conf.mode&&CodeMirror.getMode(config,conf.mode)});}
scriptTypes.push({matches:/./,mode:CodeMirror.getMode(config,"text/plain")});function html(stream,state){var tagName=state.htmlState.tagName;var style=htmlMode.token(stream,state.htmlState);if(tagName=="script"&&/\btag\b/.test(style)&&stream.current()==">"){var scriptType=stream.string.slice(Math.max(0,stream.pos-100),stream.pos).match(/\btype\s*=\s*("[^"]+"|'[^']+'|\S+)[^<]*$/i);scriptType=scriptType?scriptType[1]:"";if(scriptType&&/[\"\']/.test(scriptType.charAt(0)))scriptType=scriptType.slice(1,scriptType.length-1);for(var i=0;i<scriptTypes.length;++i){var tp=scriptTypes[i];if(typeof tp.matches=="string"?scriptType==tp.matches:tp.matches.test(scriptType)){if(tp.mode){state.token=script;state.localMode=tp.mode;state.localState=tp.mode.startState&&tp.mode.startState(htmlMode.indent(state.htmlState,""));}
break;}}}else if(tagName=="style"&&/\btag\b/.test(style)&&stream.current()==">"){state.token=css;state.localMode=cssMode;state.localState=cssMode.startState(htmlMode.indent(state.htmlState,""));}
return style;}
function maybeBackup(stream,pat,style){var cur=stream.current();var close=cur.search(pat),m;if(close>-1)stream.backUp(cur.length-close);else if(m=cur.match(/<\/?$/)){stream.backUp(cur.length);if(!stream.match(pat,false))stream.match(cur);}
return style;}
function script(stream,state){if(stream.match(/^<\/\s*script\s*>/i,false)){state.token=html;state.localState=state.localMode=null;return html(stream,state);}
return maybeBackup(stream,/<\/\s*script\s*>/,state.localMode.token(stream,state.localState));}
function css(stream,state){if(stream.match(/^<\/\s*style\s*>/i,false)){state.token=html;state.localState=state.localMode=null;return html(stream,state);}
return maybeBackup(stream,/<\/\s*style\s*>/,cssMode.token(stream,state.localState));}
return{startState:function(){var state=htmlMode.startState();return{token:html,localMode:null,localState:null,htmlState:state};},copyState:function(state){if(state.localState)
var local=CodeMirror.copyState(state.localMode,state.localState);return{token:state.token,localMode:state.localMode,localState:local,htmlState:CodeMirror.copyState(htmlMode,state.htmlState)};},token:function(stream,state){return state.token(stream,state);},indent:function(state,textAfter){if(!state.localMode||/^\s*<\//.test(textAfter))
return htmlMode.indent(state.htmlState,textAfter);else if(state.localMode.indent)
return state.localMode.indent(state.localState,textAfter);else
return CodeMirror.Pass;},electricChars:"/{}:",innerMode:function(state){return{state:state.localState||state.htmlState,mode:state.localMode||htmlMode};}};},"xml","javascript","css");CodeMirror.defineMIME("text/html","htmlmixed");;WebInspector={};FormatterWorker={createTokenizer:function(mimeType)
{var mode=CodeMirror.getMode({indentUnit:2},mimeType);var state=CodeMirror.startState(mode);function tokenize(line,callback)
{var stream=new CodeMirror.StringStream(line);while(!stream.eol()){var style=mode.token(stream,state);var value=stream.current();callback(value,style,stream.start,stream.start+value.length);stream.start=stream.pos;}}
return tokenize;}};var FormatterParameters;var onmessage=function(event){var data=(event.data);if(!data.method)
return;FormatterWorker[data.method](data.params);};FormatterWorker.format=function(params)
{var indentString=params.indentString||"    ";var result={};if(params.mimeType==="text/html"){var formatter=new FormatterWorker.HTMLFormatter(indentString);result=formatter.format(params.content);}else if(params.mimeType==="text/css"){result.mapping={original:[0],formatted:[0]};result.content=FormatterWorker._formatCSS(params.content,result.mapping,0,0,indentString);}else{result.mapping={original:[0],formatted:[0]};result.content=FormatterWorker._formatScript(params.content,result.mapping,0,0,indentString);}
postMessage(result);}
FormatterWorker._chunkCount=function(totalLength,chunkSize)
{if(totalLength<=chunkSize)
return 1;var remainder=totalLength%chunkSize;var partialLength=totalLength-remainder;return(partialLength/chunkSize)+(remainder?1:0);}
FormatterWorker.javaScriptOutline=function(params)
{var chunkSize=100000;var totalLength=params.content.length;var lines=params.content.split("\n");var chunkCount=FormatterWorker._chunkCount(totalLength,chunkSize);var outlineChunk=[];var previousIdentifier=null;var previousToken=null;var previousTokenType=null;var currentChunk=1;var processedChunkCharacters=0;var addedFunction=false;var isReadingArguments=false;var argumentsText="";var currentFunction=null;var tokenizer=FormatterWorker.createTokenizer("text/javascript");for(var i=0;i<lines.length;++i){var line=lines[i];tokenizer(line,processToken);}
function isJavaScriptIdentifier(tokenType)
{if(!tokenType)
return false;return tokenType.startsWith("variable")||tokenType.startsWith("property")||tokenType==="def";}
function processToken(tokenValue,tokenType,column,newColumn)
{if(isJavaScriptIdentifier(tokenType)){previousIdentifier=tokenValue;if(tokenValue&&previousToken==="function"){currentFunction={line:i,column:column,name:tokenValue};addedFunction=true;previousIdentifier=null;}}else if(tokenType==="keyword"){if(tokenValue==="function"){if(previousIdentifier&&(previousToken==="="||previousToken===":")){currentFunction={line:i,column:column,name:previousIdentifier};addedFunction=true;previousIdentifier=null;}}}else if(tokenValue==="."&&isJavaScriptIdentifier(previousTokenType))
previousIdentifier+=".";else if(tokenValue==="("&&addedFunction)
isReadingArguments=true;if(isReadingArguments&&tokenValue)
argumentsText+=tokenValue;if(tokenValue===")"&&isReadingArguments){addedFunction=false;isReadingArguments=false;currentFunction.arguments=argumentsText.replace(/,[\r\n\s]*/g,", ").replace(/([^,])[\r\n\s]+/g,"$1");argumentsText="";outlineChunk.push(currentFunction);}
if(tokenValue.trim().length){previousToken=tokenValue;previousTokenType=tokenType;}
processedChunkCharacters+=newColumn-column;if(processedChunkCharacters>=chunkSize){postMessage({chunk:outlineChunk,total:chunkCount,index:currentChunk++});outlineChunk=[];processedChunkCharacters=0;}}
postMessage({chunk:outlineChunk,total:chunkCount,index:chunkCount});}
FormatterWorker.CSSParserStates={Initial:"Initial",Selector:"Selector",Style:"Style",PropertyName:"PropertyName",PropertyValue:"PropertyValue",AtRule:"AtRule",};FormatterWorker.parseCSS=function(params)
{var chunkSize=100000;var lines=params.content.split("\n");var rules=[];var processedChunkCharacters=0;var state=FormatterWorker.CSSParserStates.Initial;var rule;var property;var UndefTokenType={};function processToken(tokenValue,tokenTypes,column,newColumn)
{var tokenType=tokenTypes?tokenTypes.split(" ").keySet():UndefTokenType;switch(state){case FormatterWorker.CSSParserStates.Initial:if(tokenType["qualifier"]||tokenType["builtin"]||tokenType["tag"]){rule={selectorText:tokenValue,lineNumber:lineNumber,columNumber:column,properties:[],};state=FormatterWorker.CSSParserStates.Selector;}else if(tokenType["def"]){rule={atRule:tokenValue,lineNumber:lineNumber,columNumber:column,};state=FormatterWorker.CSSParserStates.AtRule;}
break;case FormatterWorker.CSSParserStates.Selector:if(tokenValue==="{"&&tokenType===UndefTokenType){rule.selectorText=rule.selectorText.trim();state=FormatterWorker.CSSParserStates.Style;}else{rule.selectorText+=tokenValue;}
break;case FormatterWorker.CSSParserStates.AtRule:if((tokenValue===";"||tokenValue==="{")&&tokenType===UndefTokenType){rule.atRule=rule.atRule.trim();rules.push(rule);state=FormatterWorker.CSSParserStates.Initial;}else{rule.atRule+=tokenValue;}
break;case FormatterWorker.CSSParserStates.Style:if(tokenType["meta"]||tokenType["property"]){property={name:tokenValue,value:"",};state=FormatterWorker.CSSParserStates.PropertyName;}else if(tokenValue==="}"&&tokenType===UndefTokenType){rules.push(rule);state=FormatterWorker.CSSParserStates.Initial;}
break;case FormatterWorker.CSSParserStates.PropertyName:if(tokenValue===":"&&tokenType["operator"]){property.name=property.name.trim();state=FormatterWorker.CSSParserStates.PropertyValue;}else if(tokenType["property"]){property.name+=tokenValue;}
break;case FormatterWorker.CSSParserStates.PropertyValue:if(tokenValue===";"&&tokenType===UndefTokenType){property.value=property.value.trim();rule.properties.push(property);state=FormatterWorker.CSSParserStates.Style;}else if(tokenValue==="}"&&tokenType===UndefTokenType){property.value=property.value.trim();rule.properties.push(property);rules.push(rule);state=FormatterWorker.CSSParserStates.Initial;}else if(!tokenType["comment"]){property.value+=tokenValue;}
break;default:console.assert(false,"Unknown CSS parser state.");}
processedChunkCharacters+=newColumn-column;if(processedChunkCharacters>chunkSize){postMessage({chunk:rules,isLastChunk:false});rules=[];processedChunkCharacters=0;}}
var tokenizer=FormatterWorker.createTokenizer("text/css");var lineNumber;for(lineNumber=0;lineNumber<lines.length;++lineNumber){var line=lines[lineNumber];tokenizer(line,processToken);}
postMessage({chunk:rules,isLastChunk:true});}
FormatterWorker._formatScript=function(content,mapping,offset,formattedOffset,indentString)
{var formattedContent;try{var tokenizer=new FormatterWorker.JavaScriptTokenizer(content);var builder=new FormatterWorker.JavaScriptFormattedContentBuilder(tokenizer.content(),mapping,offset,formattedOffset,indentString);var formatter=new FormatterWorker.JavaScriptFormatter(tokenizer,builder);formatter.format();formattedContent=builder.content();}catch(e){formattedContent=content;}
return formattedContent;}
FormatterWorker._formatCSS=function(content,mapping,offset,formattedOffset,indentString)
{var formattedContent;try{var builder=new FormatterWorker.CSSFormattedContentBuilder(content,mapping,offset,formattedOffset,indentString);var formatter=new FormatterWorker.CSSFormatter(content,builder);formatter.format();formattedContent=builder.content();}catch(e){formattedContent=content;}
return formattedContent;}
FormatterWorker.HTMLFormatter=function(indentString)
{this._indentString=indentString;}
FormatterWorker.HTMLFormatter.prototype={format:function(content)
{this.line=content;this._content=content;this._formattedContent="";this._mapping={original:[0],formatted:[0]};this._position=0;var scriptOpened=false;var styleOpened=false;var tokenizer=FormatterWorker.createTokenizer("text/html");function processToken(tokenValue,tokenType,tokenStart,tokenEnd){if(tokenType!=="tag")
return;if(tokenValue.toLowerCase()==="<script"){scriptOpened=true;}else if(scriptOpened&&tokenValue===">"){scriptOpened=false;this._scriptStarted(tokenEnd);}else if(tokenValue.toLowerCase()==="</script"){this._scriptEnded(tokenStart);}else if(tokenValue.toLowerCase()==="<style"){styleOpened=true;}else if(styleOpened&&tokenValue===">"){styleOpened=false;this._styleStarted(tokenEnd);}else if(tokenValue.toLowerCase()==="</style"){this._styleEnded(tokenStart);}}
tokenizer(content,processToken.bind(this));this._formattedContent+=this._content.substring(this._position);return{content:this._formattedContent,mapping:this._mapping};},_scriptStarted:function(cursor)
{this._handleSubFormatterStart(cursor);},_scriptEnded:function(cursor)
{this._handleSubFormatterEnd(FormatterWorker._formatScript,cursor);},_styleStarted:function(cursor)
{this._handleSubFormatterStart(cursor);},_styleEnded:function(cursor)
{this._handleSubFormatterEnd(FormatterWorker._formatCSS,cursor);},_handleSubFormatterStart:function(cursor)
{this._formattedContent+=this._content.substring(this._position,cursor);this._formattedContent+="\n";this._position=cursor;},_handleSubFormatterEnd:function(formatFunction,cursor)
{if(cursor===this._position)
return;var scriptContent=this._content.substring(this._position,cursor);this._mapping.original.push(this._position);this._mapping.formatted.push(this._formattedContent.length);var formattedScriptContent=formatFunction(scriptContent,this._mapping,this._position,this._formattedContent.length,this._indentString);this._formattedContent+=formattedScriptContent;this._position=cursor;}}
Array.prototype.keySet=function()
{var keys={};for(var i=0;i<this.length;++i)
keys[this[i]]=true;return keys;};function require()
{return parse;}
var exports={tokenizer:null};var KEYWORDS=array_to_hash(["break","case","catch","const","continue","default","delete","do","else","finally","for","function","if","in","instanceof","new","return","switch","throw","try","typeof","var","void","while","with"]);var RESERVED_WORDS=array_to_hash(["abstract","boolean","byte","char","class","debugger","double","enum","export","extends","final","float","goto","implements","import","int","interface","long","native","package","private","protected","public","short","static","super","synchronized","throws","transient","volatile"]);var KEYWORDS_BEFORE_EXPRESSION=array_to_hash(["return","new","delete","throw","else","case"]);var KEYWORDS_ATOM=array_to_hash(["false","null","true","undefined"]);var OPERATOR_CHARS=array_to_hash(characters("+-*&%=<>!?|~^"));var RE_HEX_NUMBER=/^0x[0-9a-f]+$/i;var RE_OCT_NUMBER=/^0[0-7]+$/;var RE_DEC_NUMBER=/^\d*\.?\d*(?:e[+-]?\d*(?:\d\.?|\.?\d)\d*)?$/i;var OPERATORS=array_to_hash(["in","instanceof","typeof","new","void","delete","++","--","+","-","!","~","&","|","^","*","/","%",">>","<<",">>>","<",">","<=",">=","==","===","!=","!==","?","=","+=","-=","/=","*=","%=",">>=","<<=",">>>=","%=","|=","^=","&=","&&","||"]);var WHITESPACE_CHARS=array_to_hash(characters(" \n\r\t"));var PUNC_BEFORE_EXPRESSION=array_to_hash(characters("[{}(,.;:"));var PUNC_CHARS=array_to_hash(characters("[]{}(),;:"));var REGEXP_MODIFIERS=array_to_hash(characters("gmsiy"));function is_alphanumeric_char(ch){ch=ch.charCodeAt(0);return(ch>=48&&ch<=57)||(ch>=65&&ch<=90)||(ch>=97&&ch<=122);};function is_identifier_char(ch){return is_alphanumeric_char(ch)||ch=="$"||ch=="_";};function is_digit(ch){ch=ch.charCodeAt(0);return ch>=48&&ch<=57;};function parse_js_number(num){if(RE_HEX_NUMBER.test(num)){return parseInt(num.substr(2),16);}else if(RE_OCT_NUMBER.test(num)){return parseInt(num.substr(1),8);}else if(RE_DEC_NUMBER.test(num)){return parseFloat(num);}};function JS_Parse_Error(message,line,col,pos){this.message=message;this.line=line;this.col=col;this.pos=pos;try{({})();}catch(ex){this.stack=ex.stack;};};JS_Parse_Error.prototype.toString=function(){return this.message+" (line: "+this.line+", col: "+this.col+", pos: "+this.pos+")"+"\n\n"+this.stack;};function js_error(message,line,col,pos){throw new JS_Parse_Error(message,line,col,pos);};function is_token(token,type,val){return token.type==type&&(val==null||token.value==val);};var EX_EOF={};function tokenizer($TEXT){var S={text:$TEXT.replace(/\r\n?|[\n\u2028\u2029]/g,"\n").replace(/^\uFEFF/,''),pos:0,tokpos:0,line:0,tokline:0,col:0,tokcol:0,newline_before:false,regex_allowed:false,comments_before:[]};function peek(){return S.text.charAt(S.pos);};function next(signal_eof){var ch=S.text.charAt(S.pos++);if(signal_eof&&!ch)
throw EX_EOF;if(ch=="\n"){S.newline_before=true;++S.line;S.col=0;}else{++S.col;}
return ch;};function eof(){return!S.peek();};function find(what,signal_eof){var pos=S.text.indexOf(what,S.pos);if(signal_eof&&pos==-1)throw EX_EOF;return pos;};function start_token(){S.tokline=S.line;S.tokcol=S.col;S.tokpos=S.pos;};function token(type,value,is_comment){S.regex_allowed=((type=="operator"&&!HOP(UNARY_POSTFIX,value))||(type=="keyword"&&HOP(KEYWORDS_BEFORE_EXPRESSION,value))||(type=="punc"&&HOP(PUNC_BEFORE_EXPRESSION,value)));var ret={type:type,value:value,line:S.tokline,col:S.tokcol,pos:S.tokpos,nlb:S.newline_before};if(!is_comment){ret.comments_before=S.comments_before;S.comments_before=[];}
S.newline_before=false;return ret;};function skip_whitespace(){while(HOP(WHITESPACE_CHARS,peek()))
next();};function read_while(pred){var ret="",ch=peek(),i=0;while(ch&&pred(ch,i++)){ret+=next();ch=peek();}
return ret;};function parse_error(err){js_error(err,S.tokline,S.tokcol,S.tokpos);};function read_num(prefix){var has_e=false,after_e=false,has_x=false,has_dot=prefix==".";var num=read_while(function(ch,i){if(ch=="x"||ch=="X"){if(has_x)return false;return has_x=true;}
if(!has_x&&(ch=="E"||ch=="e")){if(has_e)return false;return has_e=after_e=true;}
if(ch=="-"){if(after_e||(i==0&&!prefix))return true;return false;}
if(ch=="+")return after_e;after_e=false;if(ch=="."){if(!has_dot)
return has_dot=true;return false;}
return is_alphanumeric_char(ch);});if(prefix)
num=prefix+num;var valid=parse_js_number(num);if(!isNaN(valid)){return token("num",valid);}else{parse_error("Invalid syntax: "+num);}};function read_escaped_char(){var ch=next(true);switch(ch){case"n":return"\n";case"r":return"\r";case"t":return"\t";case"b":return"\b";case"v":return"\v";case"f":return"\f";case"0":return"\0";case"x":return String.fromCharCode(hex_bytes(2));case"u":return String.fromCharCode(hex_bytes(4));default:return ch;}};function hex_bytes(n){var num=0;for(;n>0;--n){var digit=parseInt(next(true),16);if(isNaN(digit))
parse_error("Invalid hex-character pattern in string");num=(num<<4)|digit;}
return num;};function read_string(){return with_eof_error("Unterminated string constant",function(){var quote=next(),ret="";for(;;){var ch=next(true);if(ch=="\\")ch=read_escaped_char();else if(ch==quote)break;ret+=ch;}
return token("string",ret);});};function read_line_comment(){next();var i=find("\n"),ret;if(i==-1){ret=S.text.substr(S.pos);S.pos=S.text.length;}else{ret=S.text.substring(S.pos,i);S.pos=i;}
return token("comment1",ret,true);};function read_multiline_comment(){next();return with_eof_error("Unterminated multiline comment",function(){var i=find("*/",true),text=S.text.substring(S.pos,i),tok=token("comment2",text,true);S.pos=i+2;S.line+=text.split("\n").length-1;S.newline_before=text.indexOf("\n")>=0;return tok;});};function read_regexp(){return with_eof_error("Unterminated regular expression",function(){var prev_backslash=false,regexp="",ch,in_class=false;while((ch=next(true)))if(prev_backslash){regexp+="\\"+ch;prev_backslash=false;}else if(ch=="["){in_class=true;regexp+=ch;}else if(ch=="]"&&in_class){in_class=false;regexp+=ch;}else if(ch=="/"&&!in_class){break;}else if(ch=="\\"){prev_backslash=true;}else{regexp+=ch;}
var mods=read_while(function(ch){return HOP(REGEXP_MODIFIERS,ch);});return token("regexp",[regexp,mods]);});};function read_operator(prefix){function grow(op){if(!peek())return op;var bigger=op+peek();if(HOP(OPERATORS,bigger)){next();return grow(bigger);}else{return op;}};return token("operator",grow(prefix||next()));};function handle_slash(){next();var regex_allowed=S.regex_allowed;switch(peek()){case"/":S.comments_before.push(read_line_comment());S.regex_allowed=regex_allowed;return next_token();case"*":S.comments_before.push(read_multiline_comment());S.regex_allowed=regex_allowed;return next_token();}
return S.regex_allowed?read_regexp():read_operator("/");};function handle_dot(){next();return is_digit(peek())?read_num("."):token("punc",".");};function read_word(){var word=read_while(is_identifier_char);return!HOP(KEYWORDS,word)?token("name",word):HOP(OPERATORS,word)?token("operator",word):HOP(KEYWORDS_ATOM,word)?token("atom",word):token("keyword",word);};function with_eof_error(eof_error,cont){try{return cont();}catch(ex){if(ex===EX_EOF)parse_error(eof_error);else throw ex;}};function next_token(force_regexp){if(force_regexp)
return read_regexp();skip_whitespace();start_token();var ch=peek();if(!ch)return token("eof");if(is_digit(ch))return read_num();if(ch=='"'||ch=="'")return read_string();if(HOP(PUNC_CHARS,ch))return token("punc",next());if(ch==".")return handle_dot();if(ch=="/")return handle_slash();if(HOP(OPERATOR_CHARS,ch))return read_operator();if(is_identifier_char(ch))return read_word();parse_error("Unexpected character '"+ch+"'");};next_token.context=function(nc){if(nc)S=nc;return S;};return next_token;};var UNARY_PREFIX=array_to_hash(["typeof","void","delete","--","++","!","~","-","+"]);var UNARY_POSTFIX=array_to_hash(["--","++"]);var ASSIGNMENT=(function(a,ret,i){while(i<a.length){ret[a[i]]=a[i].substr(0,a[i].length-1);i++;}
return ret;})(["+=","-=","/=","*=","%=",">>=","<<=",">>>=","|=","^=","&="],{"=":true},0);var PRECEDENCE=(function(a,ret){for(var i=0,n=1;i<a.length;++i,++n){var b=a[i];for(var j=0;j<b.length;++j){ret[b[j]]=n;}}
return ret;})([["||"],["&&"],["|"],["^"],["&"],["==","===","!=","!=="],["<",">","<=",">=","in","instanceof"],[">>","<<",">>>"],["+","-"],["*","/","%"]],{});var STATEMENTS_WITH_LABELS=array_to_hash(["for","do","while","switch"]);var ATOMIC_START_TOKEN=array_to_hash(["atom","num","string","regexp","name"]);function NodeWithToken(str,start,end){this.name=str;this.start=start;this.end=end;};NodeWithToken.prototype.toString=function(){return this.name;};function parse($TEXT,strict_mode,embed_tokens){var S={input:typeof $TEXT=="string"?tokenizer($TEXT,true):$TEXT,token:null,prev:null,peeked:null,in_function:0,in_loop:0,labels:[]};S.token=next();function is(type,value){return is_token(S.token,type,value);};function peek(){return S.peeked||(S.peeked=S.input());};function next(){S.prev=S.token;if(S.peeked){S.token=S.peeked;S.peeked=null;}else{S.token=S.input();}
return S.token;};function prev(){return S.prev;};function croak(msg,line,col,pos){var ctx=S.input.context();js_error(msg,line!=null?line:ctx.tokline,col!=null?col:ctx.tokcol,pos!=null?pos:ctx.tokpos);};function token_error(token,msg){croak(msg,token.line,token.col);};function unexpected(token){if(token==null)
token=S.token;token_error(token,"Unexpected token: "+token.type+" ("+token.value+")");};function expect_token(type,val){if(is(type,val)){return next();}
token_error(S.token,"Unexpected token "+S.token.type+", expected "+type);};function expect(punc){return expect_token("punc",punc);};function can_insert_semicolon(){return!strict_mode&&(S.token.nlb||is("eof")||is("punc","}"));};function semicolon(){if(is("punc",";"))next();else if(!can_insert_semicolon())unexpected();};function as(){return slice(arguments);};function parenthesised(){expect("(");var ex=expression();expect(")");return ex;};function add_tokens(str,start,end){return new NodeWithToken(str,start,end);};var statement=embed_tokens?function(){var start=S.token;var stmt=$statement();stmt[0]=add_tokens(stmt[0],start,prev());return stmt;}:$statement;function $statement(){if(is("operator","/")){S.peeked=null;S.token=S.input(true);}
switch(S.token.type){case"num":case"string":case"regexp":case"operator":case"atom":return simple_statement();case"name":return is_token(peek(),"punc",":")?labeled_statement(prog1(S.token.value,next,next)):simple_statement();case"punc":switch(S.token.value){case"{":return as("block",block_());case"[":case"(":return simple_statement();case";":next();return as("block");default:unexpected();}
case"keyword":switch(prog1(S.token.value,next)){case"break":return break_cont("break");case"continue":return break_cont("continue");case"debugger":semicolon();return as("debugger");case"do":return(function(body){expect_token("keyword","while");return as("do",prog1(parenthesised,semicolon),body);})(in_loop(statement));case"for":return for_();case"function":return function_(true);case"if":return if_();case"return":if(S.in_function==0)
croak("'return' outside of function");return as("return",is("punc",";")?(next(),null):can_insert_semicolon()?null:prog1(expression,semicolon));case"switch":return as("switch",parenthesised(),switch_block_());case"throw":return as("throw",prog1(expression,semicolon));case"try":return try_();case"var":return prog1(var_,semicolon);case"const":return prog1(const_,semicolon);case"while":return as("while",parenthesised(),in_loop(statement));case"with":return as("with",parenthesised(),statement());default:unexpected();}}};function labeled_statement(label){S.labels.push(label);var start=S.token,stat=statement();if(strict_mode&&!HOP(STATEMENTS_WITH_LABELS,stat[0]))
unexpected(start);S.labels.pop();return as("label",label,stat);};function simple_statement(){return as("stat",prog1(expression,semicolon));};function break_cont(type){var name=is("name")?S.token.value:null;if(name!=null){next();if(!member(name,S.labels))
croak("Label "+name+" without matching loop or statement");}
else if(S.in_loop==0)
croak(type+" not inside a loop or switch");semicolon();return as(type,name);};function for_(){expect("(");var has_var=is("keyword","var");if(has_var)
next();if(is("name")&&is_token(peek(),"operator","in")){var name=S.token.value;next();next();var obj=expression();expect(")");return as("for-in",has_var,name,obj,in_loop(statement));}else{var init=is("punc",";")?null:has_var?var_():expression();expect(";");var test=is("punc",";")?null:expression();expect(";");var step=is("punc",")")?null:expression();expect(")");return as("for",init,test,step,in_loop(statement));}};function function_(in_statement){var name=is("name")?prog1(S.token.value,next):null;if(in_statement&&!name)
unexpected();expect("(");return as(in_statement?"defun":"function",name,(function(first,a){while(!is("punc",")")){if(first)first=false;else expect(",");if(!is("name"))unexpected();a.push(S.token.value);next();}
next();return a;})(true,[]),(function(){++S.in_function;var loop=S.in_loop;S.in_loop=0;var a=block_();--S.in_function;S.in_loop=loop;return a;})());};function if_(){var cond=parenthesised(),body=statement(),belse;if(is("keyword","else")){next();belse=statement();}
return as("if",cond,body,belse);};function block_(){expect("{");var a=[];while(!is("punc","}")){if(is("eof"))unexpected();a.push(statement());}
next();return a;};var switch_block_=curry(in_loop,function(){expect("{");var a=[],cur=null;while(!is("punc","}")){if(is("eof"))unexpected();if(is("keyword","case")){next();cur=[];a.push([expression(),cur]);expect(":");}
else if(is("keyword","default")){next();expect(":");cur=[];a.push([null,cur]);}
else{if(!cur)unexpected();cur.push(statement());}}
next();return a;});function try_(){var body=block_(),bcatch,bfinally;if(is("keyword","catch")){next();expect("(");if(!is("name"))
croak("Name expected");var name=S.token.value;next();expect(")");bcatch=[name,block_()];}
if(is("keyword","finally")){next();bfinally=block_();}
if(!bcatch&&!bfinally)
croak("Missing catch/finally blocks");return as("try",body,bcatch,bfinally);};function vardefs(){var a=[];for(;;){if(!is("name"))
unexpected();var name=S.token.value;next();if(is("operator","=")){next();a.push([name,expression(false)]);}else{a.push([name]);}
if(!is("punc",","))
break;next();}
return a;};function var_(){return as("var",vardefs());};function const_(){return as("const",vardefs());};function new_(){var newexp=expr_atom(false),args;if(is("punc","(")){next();args=expr_list(")");}else{args=[];}
return subscripts(as("new",newexp,args),true);};function expr_atom(allow_calls){if(is("operator","new")){next();return new_();}
if(is("operator")&&HOP(UNARY_PREFIX,S.token.value)){return make_unary("unary-prefix",prog1(S.token.value,next),expr_atom(allow_calls));}
if(is("punc")){switch(S.token.value){case"(":next();return subscripts(prog1(expression,curry(expect,")")),allow_calls);case"[":next();return subscripts(array_(),allow_calls);case"{":next();return subscripts(object_(),allow_calls);}
unexpected();}
if(is("keyword","function")){next();return subscripts(function_(false),allow_calls);}
if(HOP(ATOMIC_START_TOKEN,S.token.type)){var atom=S.token.type=="regexp"?as("regexp",S.token.value[0],S.token.value[1]):as(S.token.type,S.token.value);return subscripts(prog1(atom,next),allow_calls);}
unexpected();};function expr_list(closing,allow_trailing_comma,allow_empty){var first=true,a=[];while(!is("punc",closing)){if(first)first=false;else expect(",");if(allow_trailing_comma&&is("punc",closing))break;if(is("punc",",")&&allow_empty){a.push(["atom","undefined"]);}else{a.push(expression(false));}}
next();return a;};function array_(){return as("array",expr_list("]",!strict_mode,true));};function object_(){var first=true,a=[];while(!is("punc","}")){if(first)first=false;else expect(",");if(!strict_mode&&is("punc","}"))
break;var type=S.token.type;var name=as_property_name();if(type=="name"&&(name=="get"||name=="set")&&!is("punc",":")){a.push([as_name(),function_(false),name]);}else{expect(":");a.push([name,expression(false)]);}}
next();return as("object",a);};function as_property_name(){switch(S.token.type){case"num":case"string":return prog1(S.token.value,next);}
return as_name();};function as_name(){switch(S.token.type){case"name":case"operator":case"keyword":case"atom":return prog1(S.token.value,next);default:unexpected();}};function subscripts(expr,allow_calls){if(is("punc",".")){next();return subscripts(as("dot",expr,as_name()),allow_calls);}
if(is("punc","[")){next();return subscripts(as("sub",expr,prog1(expression,curry(expect,"]"))),allow_calls);}
if(allow_calls&&is("punc","(")){next();return subscripts(as("call",expr,expr_list(")")),true);}
if(allow_calls&&is("operator")&&HOP(UNARY_POSTFIX,S.token.value)){return prog1(curry(make_unary,"unary-postfix",S.token.value,expr),next);}
return expr;};function make_unary(tag,op,expr){if((op=="++"||op=="--")&&!is_assignable(expr))
croak("Invalid use of "+op+" operator");return as(tag,op,expr);};function expr_op(left,min_prec){var op=is("operator")?S.token.value:null;var prec=op!=null?PRECEDENCE[op]:null;if(prec!=null&&prec>min_prec){next();var right=expr_op(expr_atom(true),prec);return expr_op(as("binary",op,left,right),min_prec);}
return left;};function expr_ops(){return expr_op(expr_atom(true),0);};function maybe_conditional(){var expr=expr_ops();if(is("operator","?")){next();var yes=expression(false);expect(":");return as("conditional",expr,yes,expression(false));}
return expr;};function is_assignable(expr){switch(expr[0]){case"dot":case"sub":return true;case"name":return expr[1]!="this";}};function maybe_assign(){var left=maybe_conditional(),val=S.token.value;if(is("operator")&&HOP(ASSIGNMENT,val)){if(is_assignable(left)){next();return as("assign",ASSIGNMENT[val],left,maybe_assign());}
croak("Invalid assignment");}
return left;};function expression(commas){if(arguments.length==0)
commas=true;var expr=maybe_assign();if(commas&&is("punc",",")){next();return as("seq",expr,expression());}
return expr;};function in_loop(cont){try{++S.in_loop;return cont();}finally{--S.in_loop;}};return as("toplevel",(function(a){while(!is("eof"))
a.push(statement());return a;})([]));};function curry(f){var args=slice(arguments,1);return function(){return f.apply(this,args.concat(slice(arguments)));};};function prog1(ret){if(ret instanceof Function)
ret=ret();for(var i=1,n=arguments.length;--n>0;++i)
arguments[i]();return ret;};function array_to_hash(a){var ret={};for(var i=0;i<a.length;++i)
ret[a[i]]=true;return ret;};function slice(a,start){return Array.prototype.slice.call(a,start==null?0:start);};function characters(str){return str.split("");};function member(name,array){for(var i=array.length;--i>=0;)
if(array[i]===name)
return true;return false;};function HOP(obj,prop){return Object.prototype.hasOwnProperty.call(obj,prop);};exports.tokenizer=tokenizer;exports.parse=parse;exports.slice=slice;exports.curry=curry;exports.member=member;exports.array_to_hash=array_to_hash;exports.PRECEDENCE=PRECEDENCE;exports.KEYWORDS_ATOM=KEYWORDS_ATOM;exports.RESERVED_WORDS=RESERVED_WORDS;exports.KEYWORDS=KEYWORDS;exports.ATOMIC_START_TOKEN=ATOMIC_START_TOKEN;exports.OPERATORS=OPERATORS;exports.is_alphanumeric_char=is_alphanumeric_char;exports.is_identifier_char=is_identifier_char;;var parse=exports;FormatterWorker.JavaScriptFormatter=function(tokenizer,builder)
{this._tokenizer=tokenizer;this._builder=builder;this._token=null;this._nextToken=this._tokenizer.next();}
FormatterWorker.JavaScriptFormatter.prototype={format:function()
{this._parseSourceElements(FormatterWorker.JavaScriptTokens.EOS);this._consume(FormatterWorker.JavaScriptTokens.EOS);},_peek:function()
{return this._nextToken.token;},_next:function()
{if(this._token&&this._token.token===FormatterWorker.JavaScriptTokens.EOS)
throw"Unexpected EOS token";this._builder.addToken(this._nextToken);this._token=this._nextToken;this._nextToken=this._tokenizer.next(this._forceRegexp);this._forceRegexp=false;return this._token.token;},_consume:function(token)
{var next=this._next();if(next!==token)
throw"Unexpected token in consume: expected "+token+", actual "+next;},_expect:function(token)
{var next=this._next();if(next!==token)
throw"Unexpected token: expected "+token+", actual "+next;},_expectSemicolon:function()
{if(this._peek()===FormatterWorker.JavaScriptTokens.SEMICOLON)
this._consume(FormatterWorker.JavaScriptTokens.SEMICOLON);},_hasLineTerminatorBeforeNext:function()
{return this._nextToken.nlb;},_parseSourceElements:function(endToken)
{while(this._peek()!==endToken){this._parseStatement();this._builder.addNewLine();}},_parseStatementOrBlock:function()
{if(this._peek()===FormatterWorker.JavaScriptTokens.LBRACE){this._builder.addSpace();this._parseBlock();return true;}
this._builder.addNewLine();this._builder.increaseNestingLevel();this._parseStatement();this._builder.decreaseNestingLevel();},_parseStatement:function()
{switch(this._peek()){case FormatterWorker.JavaScriptTokens.LBRACE:return this._parseBlock();case FormatterWorker.JavaScriptTokens.CONST:case FormatterWorker.JavaScriptTokens.VAR:return this._parseVariableStatement();case FormatterWorker.JavaScriptTokens.SEMICOLON:return this._next();case FormatterWorker.JavaScriptTokens.IF:return this._parseIfStatement();case FormatterWorker.JavaScriptTokens.DO:return this._parseDoWhileStatement();case FormatterWorker.JavaScriptTokens.WHILE:return this._parseWhileStatement();case FormatterWorker.JavaScriptTokens.FOR:return this._parseForStatement();case FormatterWorker.JavaScriptTokens.CONTINUE:return this._parseContinueStatement();case FormatterWorker.JavaScriptTokens.BREAK:return this._parseBreakStatement();case FormatterWorker.JavaScriptTokens.RETURN:return this._parseReturnStatement();case FormatterWorker.JavaScriptTokens.WITH:return this._parseWithStatement();case FormatterWorker.JavaScriptTokens.SWITCH:return this._parseSwitchStatement();case FormatterWorker.JavaScriptTokens.THROW:return this._parseThrowStatement();case FormatterWorker.JavaScriptTokens.TRY:return this._parseTryStatement();case FormatterWorker.JavaScriptTokens.FUNCTION:return this._parseFunctionDeclaration();case FormatterWorker.JavaScriptTokens.DEBUGGER:return this._parseDebuggerStatement();default:return this._parseExpressionOrLabelledStatement();}},_parseFunctionDeclaration:function()
{this._expect(FormatterWorker.JavaScriptTokens.FUNCTION);this._builder.addSpace();this._expect(FormatterWorker.JavaScriptTokens.IDENTIFIER);this._parseFunctionLiteral()},_parseBlock:function()
{this._expect(FormatterWorker.JavaScriptTokens.LBRACE);this._builder.addNewLine();this._builder.increaseNestingLevel();while(this._peek()!==FormatterWorker.JavaScriptTokens.RBRACE){this._parseStatement();this._builder.addNewLine();}
this._builder.decreaseNestingLevel();this._expect(FormatterWorker.JavaScriptTokens.RBRACE);},_parseVariableStatement:function()
{this._parseVariableDeclarations();this._expectSemicolon();},_parseVariableDeclarations:function()
{if(this._peek()===FormatterWorker.JavaScriptTokens.VAR)
this._consume(FormatterWorker.JavaScriptTokens.VAR);else
this._consume(FormatterWorker.JavaScriptTokens.CONST)
this._builder.addSpace();var isFirstVariable=true;do{if(!isFirstVariable){this._consume(FormatterWorker.JavaScriptTokens.COMMA);this._builder.addSpace();}
isFirstVariable=false;this._expect(FormatterWorker.JavaScriptTokens.IDENTIFIER);if(this._peek()===FormatterWorker.JavaScriptTokens.ASSIGN){this._builder.addSpace();this._consume(FormatterWorker.JavaScriptTokens.ASSIGN);this._builder.addSpace();this._parseAssignmentExpression();}}while(this._peek()===FormatterWorker.JavaScriptTokens.COMMA);},_parseExpressionOrLabelledStatement:function()
{this._parseExpression();if(this._peek()===FormatterWorker.JavaScriptTokens.COLON){this._expect(FormatterWorker.JavaScriptTokens.COLON);this._builder.addSpace();this._parseStatement();}
this._expectSemicolon();},_parseIfStatement:function()
{this._expect(FormatterWorker.JavaScriptTokens.IF);this._builder.addSpace();this._expect(FormatterWorker.JavaScriptTokens.LPAREN);this._parseExpression();this._expect(FormatterWorker.JavaScriptTokens.RPAREN);var isBlock=this._parseStatementOrBlock();if(this._peek()===FormatterWorker.JavaScriptTokens.ELSE){if(isBlock)
this._builder.addSpace();else
this._builder.addNewLine();this._next();if(this._peek()===FormatterWorker.JavaScriptTokens.IF){this._builder.addSpace();this._parseStatement();}else
this._parseStatementOrBlock();}},_parseContinueStatement:function()
{this._expect(FormatterWorker.JavaScriptTokens.CONTINUE);var token=this._peek();if(!this._hasLineTerminatorBeforeNext()&&token!==FormatterWorker.JavaScriptTokens.SEMICOLON&&token!==FormatterWorker.JavaScriptTokens.RBRACE&&token!==FormatterWorker.JavaScriptTokens.EOS){this._builder.addSpace();this._expect(FormatterWorker.JavaScriptTokens.IDENTIFIER);}
this._expectSemicolon();},_parseBreakStatement:function()
{this._expect(FormatterWorker.JavaScriptTokens.BREAK);var token=this._peek();if(!this._hasLineTerminatorBeforeNext()&&token!==FormatterWorker.JavaScriptTokens.SEMICOLON&&token!==FormatterWorker.JavaScriptTokens.RBRACE&&token!==FormatterWorker.JavaScriptTokens.EOS){this._builder.addSpace();this._expect(FormatterWorker.JavaScriptTokens.IDENTIFIER);}
this._expectSemicolon();},_parseReturnStatement:function()
{this._expect(FormatterWorker.JavaScriptTokens.RETURN);var token=this._peek();if(!this._hasLineTerminatorBeforeNext()&&token!==FormatterWorker.JavaScriptTokens.SEMICOLON&&token!==FormatterWorker.JavaScriptTokens.RBRACE&&token!==FormatterWorker.JavaScriptTokens.EOS){this._builder.addSpace();this._parseExpression();}
this._expectSemicolon();},_parseWithStatement:function()
{this._expect(FormatterWorker.JavaScriptTokens.WITH);this._builder.addSpace();this._expect(FormatterWorker.JavaScriptTokens.LPAREN);this._parseExpression();this._expect(FormatterWorker.JavaScriptTokens.RPAREN);this._parseStatementOrBlock();},_parseCaseClause:function()
{if(this._peek()===FormatterWorker.JavaScriptTokens.CASE){this._expect(FormatterWorker.JavaScriptTokens.CASE);this._builder.addSpace();this._parseExpression();}else
this._expect(FormatterWorker.JavaScriptTokens.DEFAULT);this._expect(FormatterWorker.JavaScriptTokens.COLON);this._builder.addNewLine();this._builder.increaseNestingLevel();while(this._peek()!==FormatterWorker.JavaScriptTokens.CASE&&this._peek()!==FormatterWorker.JavaScriptTokens.DEFAULT&&this._peek()!==FormatterWorker.JavaScriptTokens.RBRACE){this._parseStatement();this._builder.addNewLine();}
this._builder.decreaseNestingLevel();},_parseSwitchStatement:function()
{this._expect(FormatterWorker.JavaScriptTokens.SWITCH);this._builder.addSpace();this._expect(FormatterWorker.JavaScriptTokens.LPAREN);this._parseExpression();this._expect(FormatterWorker.JavaScriptTokens.RPAREN);this._builder.addSpace();this._expect(FormatterWorker.JavaScriptTokens.LBRACE);this._builder.addNewLine();this._builder.increaseNestingLevel();while(this._peek()!==FormatterWorker.JavaScriptTokens.RBRACE)
this._parseCaseClause();this._builder.decreaseNestingLevel();this._expect(FormatterWorker.JavaScriptTokens.RBRACE);},_parseThrowStatement:function()
{this._expect(FormatterWorker.JavaScriptTokens.THROW);this._builder.addSpace();this._parseExpression();this._expectSemicolon();},_parseTryStatement:function()
{this._expect(FormatterWorker.JavaScriptTokens.TRY);this._builder.addSpace();this._parseBlock();var token=this._peek();if(token===FormatterWorker.JavaScriptTokens.CATCH){this._builder.addSpace();this._consume(FormatterWorker.JavaScriptTokens.CATCH);this._builder.addSpace();this._expect(FormatterWorker.JavaScriptTokens.LPAREN);this._expect(FormatterWorker.JavaScriptTokens.IDENTIFIER);this._expect(FormatterWorker.JavaScriptTokens.RPAREN);this._builder.addSpace();this._parseBlock();token=this._peek();}
if(token===FormatterWorker.JavaScriptTokens.FINALLY){this._consume(FormatterWorker.JavaScriptTokens.FINALLY);this._builder.addSpace();this._parseBlock();}},_parseDoWhileStatement:function()
{this._expect(FormatterWorker.JavaScriptTokens.DO);var isBlock=this._parseStatementOrBlock();if(isBlock)
this._builder.addSpace();else
this._builder.addNewLine();this._expect(FormatterWorker.JavaScriptTokens.WHILE);this._builder.addSpace();this._expect(FormatterWorker.JavaScriptTokens.LPAREN);this._parseExpression();this._expect(FormatterWorker.JavaScriptTokens.RPAREN);this._expectSemicolon();},_parseWhileStatement:function()
{this._expect(FormatterWorker.JavaScriptTokens.WHILE);this._builder.addSpace();this._expect(FormatterWorker.JavaScriptTokens.LPAREN);this._parseExpression();this._expect(FormatterWorker.JavaScriptTokens.RPAREN);this._parseStatementOrBlock();},_parseForStatement:function()
{this._expect(FormatterWorker.JavaScriptTokens.FOR);this._builder.addSpace();this._expect(FormatterWorker.JavaScriptTokens.LPAREN);if(this._peek()!==FormatterWorker.JavaScriptTokens.SEMICOLON){if(this._peek()===FormatterWorker.JavaScriptTokens.VAR||this._peek()===FormatterWorker.JavaScriptTokens.CONST){this._parseVariableDeclarations();if(this._peek()===FormatterWorker.JavaScriptTokens.IN){this._builder.addSpace();this._consume(FormatterWorker.JavaScriptTokens.IN);this._builder.addSpace();this._parseExpression();}}else
this._parseExpression();}
if(this._peek()!==FormatterWorker.JavaScriptTokens.RPAREN){this._expect(FormatterWorker.JavaScriptTokens.SEMICOLON);this._builder.addSpace();if(this._peek()!==FormatterWorker.JavaScriptTokens.SEMICOLON)
this._parseExpression();this._expect(FormatterWorker.JavaScriptTokens.SEMICOLON);this._builder.addSpace();if(this._peek()!==FormatterWorker.JavaScriptTokens.RPAREN)
this._parseExpression();}
this._expect(FormatterWorker.JavaScriptTokens.RPAREN);this._parseStatementOrBlock();},_parseExpression:function()
{this._parseAssignmentExpression();while(this._peek()===FormatterWorker.JavaScriptTokens.COMMA){this._expect(FormatterWorker.JavaScriptTokens.COMMA);this._builder.addSpace();this._parseAssignmentExpression();}},_parseAssignmentExpression:function()
{this._parseConditionalExpression();var token=this._peek();if(FormatterWorker.JavaScriptTokens.ASSIGN<=token&&token<=FormatterWorker.JavaScriptTokens.ASSIGN_MOD){this._builder.addSpace();this._next();this._builder.addSpace();this._parseAssignmentExpression();}},_parseConditionalExpression:function()
{this._parseBinaryExpression();if(this._peek()===FormatterWorker.JavaScriptTokens.CONDITIONAL){this._builder.addSpace();this._consume(FormatterWorker.JavaScriptTokens.CONDITIONAL);this._builder.addSpace();this._parseAssignmentExpression();this._builder.addSpace();this._expect(FormatterWorker.JavaScriptTokens.COLON);this._builder.addSpace();this._parseAssignmentExpression();}},_parseBinaryExpression:function()
{this._parseUnaryExpression();var token=this._peek();while(FormatterWorker.JavaScriptTokens.OR<=token&&token<=FormatterWorker.JavaScriptTokens.IN){this._builder.addSpace();this._next();this._builder.addSpace();this._parseBinaryExpression();token=this._peek();}},_parseUnaryExpression:function()
{var token=this._peek();if((FormatterWorker.JavaScriptTokens.NOT<=token&&token<=FormatterWorker.JavaScriptTokens.VOID)||token===FormatterWorker.JavaScriptTokens.ADD||token===FormatterWorker.JavaScriptTokens.SUB||token===FormatterWorker.JavaScriptTokens.INC||token===FormatterWorker.JavaScriptTokens.DEC){this._next();if(token===FormatterWorker.JavaScriptTokens.DELETE||token===FormatterWorker.JavaScriptTokens.TYPEOF||token===FormatterWorker.JavaScriptTokens.VOID)
this._builder.addSpace();this._parseUnaryExpression();}else
return this._parsePostfixExpression();},_parsePostfixExpression:function()
{this._parseLeftHandSideExpression();var token=this._peek();if(!this._hasLineTerminatorBeforeNext()&&(token===FormatterWorker.JavaScriptTokens.INC||token===FormatterWorker.JavaScriptTokens.DEC))
this._next();},_parseLeftHandSideExpression:function()
{if(this._peek()===FormatterWorker.JavaScriptTokens.NEW)
this._parseNewExpression();else
this._parseMemberExpression();while(true){switch(this._peek()){case FormatterWorker.JavaScriptTokens.LBRACK:this._consume(FormatterWorker.JavaScriptTokens.LBRACK);this._parseExpression();this._expect(FormatterWorker.JavaScriptTokens.RBRACK);break;case FormatterWorker.JavaScriptTokens.LPAREN:this._parseArguments();break;case FormatterWorker.JavaScriptTokens.PERIOD:this._consume(FormatterWorker.JavaScriptTokens.PERIOD);this._expect(FormatterWorker.JavaScriptTokens.IDENTIFIER);break;default:return;}}},_parseNewExpression:function()
{this._expect(FormatterWorker.JavaScriptTokens.NEW);this._builder.addSpace();if(this._peek()===FormatterWorker.JavaScriptTokens.NEW)
this._parseNewExpression();else
this._parseMemberExpression();},_parseMemberExpression:function()
{if(this._peek()===FormatterWorker.JavaScriptTokens.FUNCTION){this._expect(FormatterWorker.JavaScriptTokens.FUNCTION);if(this._peek()===FormatterWorker.JavaScriptTokens.IDENTIFIER){this._builder.addSpace();this._expect(FormatterWorker.JavaScriptTokens.IDENTIFIER);}
this._parseFunctionLiteral();}else
this._parsePrimaryExpression();while(true){switch(this._peek()){case FormatterWorker.JavaScriptTokens.LBRACK:this._consume(FormatterWorker.JavaScriptTokens.LBRACK);this._parseExpression();this._expect(FormatterWorker.JavaScriptTokens.RBRACK);break;case FormatterWorker.JavaScriptTokens.PERIOD:this._consume(FormatterWorker.JavaScriptTokens.PERIOD);this._expect(FormatterWorker.JavaScriptTokens.IDENTIFIER);break;case FormatterWorker.JavaScriptTokens.LPAREN:this._parseArguments();break;default:return;}}},_parseDebuggerStatement:function()
{this._expect(FormatterWorker.JavaScriptTokens.DEBUGGER);this._expectSemicolon();},_parsePrimaryExpression:function()
{switch(this._peek()){case FormatterWorker.JavaScriptTokens.THIS:return this._consume(FormatterWorker.JavaScriptTokens.THIS);case FormatterWorker.JavaScriptTokens.NULL_LITERAL:return this._consume(FormatterWorker.JavaScriptTokens.NULL_LITERAL);case FormatterWorker.JavaScriptTokens.TRUE_LITERAL:return this._consume(FormatterWorker.JavaScriptTokens.TRUE_LITERAL);case FormatterWorker.JavaScriptTokens.FALSE_LITERAL:return this._consume(FormatterWorker.JavaScriptTokens.FALSE_LITERAL);case FormatterWorker.JavaScriptTokens.IDENTIFIER:return this._consume(FormatterWorker.JavaScriptTokens.IDENTIFIER);case FormatterWorker.JavaScriptTokens.NUMBER:return this._consume(FormatterWorker.JavaScriptTokens.NUMBER);case FormatterWorker.JavaScriptTokens.STRING:return this._consume(FormatterWorker.JavaScriptTokens.STRING);case FormatterWorker.JavaScriptTokens.ASSIGN_DIV:return this._parseRegExpLiteral();case FormatterWorker.JavaScriptTokens.DIV:return this._parseRegExpLiteral();case FormatterWorker.JavaScriptTokens.LBRACK:return this._parseArrayLiteral();case FormatterWorker.JavaScriptTokens.LBRACE:return this._parseObjectLiteral();case FormatterWorker.JavaScriptTokens.LPAREN:this._consume(FormatterWorker.JavaScriptTokens.LPAREN);this._parseExpression();this._expect(FormatterWorker.JavaScriptTokens.RPAREN);return;default:return this._next();}},_parseArrayLiteral:function()
{this._expect(FormatterWorker.JavaScriptTokens.LBRACK);this._builder.increaseNestingLevel();while(this._peek()!==FormatterWorker.JavaScriptTokens.RBRACK){if(this._peek()!==FormatterWorker.JavaScriptTokens.COMMA)
this._parseAssignmentExpression();if(this._peek()!==FormatterWorker.JavaScriptTokens.RBRACK){this._expect(FormatterWorker.JavaScriptTokens.COMMA);this._builder.addSpace();}}
this._builder.decreaseNestingLevel();this._expect(FormatterWorker.JavaScriptTokens.RBRACK);},_parseObjectLiteralGetSet:function()
{var token=this._peek();if(token===FormatterWorker.JavaScriptTokens.IDENTIFIER||token===FormatterWorker.JavaScriptTokens.NUMBER||token===FormatterWorker.JavaScriptTokens.STRING||FormatterWorker.JavaScriptTokens.DELETE<=token&&token<=FormatterWorker.JavaScriptTokens.FALSE_LITERAL||token===FormatterWorker.JavaScriptTokens.INSTANCEOF||token===FormatterWorker.JavaScriptTokens.IN||token===FormatterWorker.JavaScriptTokens.CONST){this._next();this._parseFunctionLiteral();}},_parseObjectLiteral:function()
{this._expect(FormatterWorker.JavaScriptTokens.LBRACE);this._builder.increaseNestingLevel();while(this._peek()!==FormatterWorker.JavaScriptTokens.RBRACE){var token=this._peek();switch(token){case FormatterWorker.JavaScriptTokens.IDENTIFIER:this._consume(FormatterWorker.JavaScriptTokens.IDENTIFIER);var name=this._token.value;if((name==="get"||name==="set")&&this._peek()!==FormatterWorker.JavaScriptTokens.COLON){this._builder.addSpace();this._parseObjectLiteralGetSet();if(this._peek()!==FormatterWorker.JavaScriptTokens.RBRACE){this._expect(FormatterWorker.JavaScriptTokens.COMMA);}
continue;}
break;case FormatterWorker.JavaScriptTokens.STRING:this._consume(FormatterWorker.JavaScriptTokens.STRING);break;case FormatterWorker.JavaScriptTokens.NUMBER:this._consume(FormatterWorker.JavaScriptTokens.NUMBER);break;default:this._next();}
this._expect(FormatterWorker.JavaScriptTokens.COLON);this._builder.addSpace();this._parseAssignmentExpression();if(this._peek()!==FormatterWorker.JavaScriptTokens.RBRACE){this._expect(FormatterWorker.JavaScriptTokens.COMMA);}}
this._builder.decreaseNestingLevel();this._expect(FormatterWorker.JavaScriptTokens.RBRACE);},_parseRegExpLiteral:function()
{if(this._nextToken.type==="regexp")
this._next();else{this._forceRegexp=true;this._next();}},_parseArguments:function()
{this._expect(FormatterWorker.JavaScriptTokens.LPAREN);var done=(this._peek()===FormatterWorker.JavaScriptTokens.RPAREN);while(!done){this._parseAssignmentExpression();done=(this._peek()===FormatterWorker.JavaScriptTokens.RPAREN);if(!done){this._expect(FormatterWorker.JavaScriptTokens.COMMA);this._builder.addSpace();}}
this._expect(FormatterWorker.JavaScriptTokens.RPAREN);},_parseFunctionLiteral:function()
{this._expect(FormatterWorker.JavaScriptTokens.LPAREN);var done=(this._peek()===FormatterWorker.JavaScriptTokens.RPAREN);while(!done){this._expect(FormatterWorker.JavaScriptTokens.IDENTIFIER);done=(this._peek()===FormatterWorker.JavaScriptTokens.RPAREN);if(!done){this._expect(FormatterWorker.JavaScriptTokens.COMMA);this._builder.addSpace();}}
this._expect(FormatterWorker.JavaScriptTokens.RPAREN);this._builder.addSpace();this._expect(FormatterWorker.JavaScriptTokens.LBRACE);this._builder.addNewLine();this._builder.increaseNestingLevel();this._parseSourceElements(FormatterWorker.JavaScriptTokens.RBRACE);this._builder.decreaseNestingLevel();this._expect(FormatterWorker.JavaScriptTokens.RBRACE);}}
FormatterWorker.JavaScriptFormattedContentBuilder=function(content,mapping,originalOffset,formattedOffset,indentString)
{this._originalContent=content;this._originalOffset=originalOffset;this._lastOriginalPosition=0;this._formattedContent=[];this._formattedContentLength=0;this._formattedOffset=formattedOffset;this._lastFormattedPosition=0;this._mapping=mapping;this._lineNumber=0;this._nestingLevel=0;this._indentString=indentString;this._cachedIndents={};}
FormatterWorker.JavaScriptFormattedContentBuilder.prototype={addToken:function(token)
{for(var i=0;i<token.comments_before.length;++i)
this._addComment(token.comments_before[i]);while(this._lineNumber<token.line){this._addText("\n");this._addIndent();this._needNewLine=false;this._lineNumber+=1;}
if(this._needNewLine){this._addText("\n");this._addIndent();this._needNewLine=false;}
this._addMappingIfNeeded(token.pos);this._addText(this._originalContent.substring(token.pos,token.endPos));this._lineNumber=token.endLine;},addSpace:function()
{this._addText(" ");},addNewLine:function()
{this._needNewLine=true;},increaseNestingLevel:function()
{this._nestingLevel+=1;},decreaseNestingLevel:function()
{this._nestingLevel-=1;},content:function()
{return this._formattedContent.join("");},_addIndent:function()
{if(this._cachedIndents[this._nestingLevel]){this._addText(this._cachedIndents[this._nestingLevel]);return;}
var fullIndent="";for(var i=0;i<this._nestingLevel;++i)
fullIndent+=this._indentString;this._addText(fullIndent);if(this._nestingLevel<=20)
this._cachedIndents[this._nestingLevel]=fullIndent;},_addComment:function(comment)
{if(this._lineNumber<comment.line){for(var j=this._lineNumber;j<comment.line;++j)
this._addText("\n");this._lineNumber=comment.line;this._needNewLine=false;this._addIndent();}else
this.addSpace();this._addMappingIfNeeded(comment.pos);if(comment.type==="comment1")
this._addText("//");else
this._addText("/*");this._addText(comment.value);if(comment.type!=="comment1"){this._addText("*/");var position;while((position=comment.value.indexOf("\n",position+1))!==-1)
this._lineNumber+=1;}},_addText:function(text)
{this._formattedContent.push(text);this._formattedContentLength+=text.length;},_addMappingIfNeeded:function(originalPosition)
{if(originalPosition-this._lastOriginalPosition===this._formattedContentLength-this._lastFormattedPosition)
return;this._mapping.original.push(this._originalOffset+originalPosition);this._lastOriginalPosition=originalPosition;this._mapping.formatted.push(this._formattedOffset+this._formattedContentLength);this._lastFormattedPosition=this._formattedContentLength;}}
FormatterWorker.JavaScriptTokens={};FormatterWorker.JavaScriptTokensByValue={};FormatterWorker.JavaScriptTokens.EOS=0;FormatterWorker.JavaScriptTokens.LPAREN=FormatterWorker.JavaScriptTokensByValue["("]=1;FormatterWorker.JavaScriptTokens.RPAREN=FormatterWorker.JavaScriptTokensByValue[")"]=2;FormatterWorker.JavaScriptTokens.LBRACK=FormatterWorker.JavaScriptTokensByValue["["]=3;FormatterWorker.JavaScriptTokens.RBRACK=FormatterWorker.JavaScriptTokensByValue["]"]=4;FormatterWorker.JavaScriptTokens.LBRACE=FormatterWorker.JavaScriptTokensByValue["{"]=5;FormatterWorker.JavaScriptTokens.RBRACE=FormatterWorker.JavaScriptTokensByValue["}"]=6;FormatterWorker.JavaScriptTokens.COLON=FormatterWorker.JavaScriptTokensByValue[":"]=7;FormatterWorker.JavaScriptTokens.SEMICOLON=FormatterWorker.JavaScriptTokensByValue[";"]=8;FormatterWorker.JavaScriptTokens.PERIOD=FormatterWorker.JavaScriptTokensByValue["."]=9;FormatterWorker.JavaScriptTokens.CONDITIONAL=FormatterWorker.JavaScriptTokensByValue["?"]=10;FormatterWorker.JavaScriptTokens.INC=FormatterWorker.JavaScriptTokensByValue["++"]=11;FormatterWorker.JavaScriptTokens.DEC=FormatterWorker.JavaScriptTokensByValue["--"]=12;FormatterWorker.JavaScriptTokens.ASSIGN=FormatterWorker.JavaScriptTokensByValue["="]=13;FormatterWorker.JavaScriptTokens.ASSIGN_BIT_OR=FormatterWorker.JavaScriptTokensByValue["|="]=14;FormatterWorker.JavaScriptTokens.ASSIGN_BIT_XOR=FormatterWorker.JavaScriptTokensByValue["^="]=15;FormatterWorker.JavaScriptTokens.ASSIGN_BIT_AND=FormatterWorker.JavaScriptTokensByValue["&="]=16;FormatterWorker.JavaScriptTokens.ASSIGN_SHL=FormatterWorker.JavaScriptTokensByValue["<<="]=17;FormatterWorker.JavaScriptTokens.ASSIGN_SAR=FormatterWorker.JavaScriptTokensByValue[">>="]=18;FormatterWorker.JavaScriptTokens.ASSIGN_SHR=FormatterWorker.JavaScriptTokensByValue[">>>="]=19;FormatterWorker.JavaScriptTokens.ASSIGN_ADD=FormatterWorker.JavaScriptTokensByValue["+="]=20;FormatterWorker.JavaScriptTokens.ASSIGN_SUB=FormatterWorker.JavaScriptTokensByValue["-="]=21;FormatterWorker.JavaScriptTokens.ASSIGN_MUL=FormatterWorker.JavaScriptTokensByValue["*="]=22;FormatterWorker.JavaScriptTokens.ASSIGN_DIV=FormatterWorker.JavaScriptTokensByValue["/="]=23;FormatterWorker.JavaScriptTokens.ASSIGN_MOD=FormatterWorker.JavaScriptTokensByValue["%="]=24;FormatterWorker.JavaScriptTokens.COMMA=FormatterWorker.JavaScriptTokensByValue[","]=25;FormatterWorker.JavaScriptTokens.OR=FormatterWorker.JavaScriptTokensByValue["||"]=26;FormatterWorker.JavaScriptTokens.AND=FormatterWorker.JavaScriptTokensByValue["&&"]=27;FormatterWorker.JavaScriptTokens.BIT_OR=FormatterWorker.JavaScriptTokensByValue["|"]=28;FormatterWorker.JavaScriptTokens.BIT_XOR=FormatterWorker.JavaScriptTokensByValue["^"]=29;FormatterWorker.JavaScriptTokens.BIT_AND=FormatterWorker.JavaScriptTokensByValue["&"]=30;FormatterWorker.JavaScriptTokens.SHL=FormatterWorker.JavaScriptTokensByValue["<<"]=31;FormatterWorker.JavaScriptTokens.SAR=FormatterWorker.JavaScriptTokensByValue[">>"]=32;FormatterWorker.JavaScriptTokens.SHR=FormatterWorker.JavaScriptTokensByValue[">>>"]=33;FormatterWorker.JavaScriptTokens.ADD=FormatterWorker.JavaScriptTokensByValue["+"]=34;FormatterWorker.JavaScriptTokens.SUB=FormatterWorker.JavaScriptTokensByValue["-"]=35;FormatterWorker.JavaScriptTokens.MUL=FormatterWorker.JavaScriptTokensByValue["*"]=36;FormatterWorker.JavaScriptTokens.DIV=FormatterWorker.JavaScriptTokensByValue["/"]=37;FormatterWorker.JavaScriptTokens.MOD=FormatterWorker.JavaScriptTokensByValue["%"]=38;FormatterWorker.JavaScriptTokens.EQ=FormatterWorker.JavaScriptTokensByValue["=="]=39;FormatterWorker.JavaScriptTokens.NE=FormatterWorker.JavaScriptTokensByValue["!="]=40;FormatterWorker.JavaScriptTokens.EQ_STRICT=FormatterWorker.JavaScriptTokensByValue["==="]=41;FormatterWorker.JavaScriptTokens.NE_STRICT=FormatterWorker.JavaScriptTokensByValue["!=="]=42;FormatterWorker.JavaScriptTokens.LT=FormatterWorker.JavaScriptTokensByValue["<"]=43;FormatterWorker.JavaScriptTokens.GT=FormatterWorker.JavaScriptTokensByValue[">"]=44;FormatterWorker.JavaScriptTokens.LTE=FormatterWorker.JavaScriptTokensByValue["<="]=45;FormatterWorker.JavaScriptTokens.GTE=FormatterWorker.JavaScriptTokensByValue[">="]=46;FormatterWorker.JavaScriptTokens.INSTANCEOF=FormatterWorker.JavaScriptTokensByValue["instanceof"]=47;FormatterWorker.JavaScriptTokens.IN=FormatterWorker.JavaScriptTokensByValue["in"]=48;FormatterWorker.JavaScriptTokens.NOT=FormatterWorker.JavaScriptTokensByValue["!"]=49;FormatterWorker.JavaScriptTokens.BIT_NOT=FormatterWorker.JavaScriptTokensByValue["~"]=50;FormatterWorker.JavaScriptTokens.DELETE=FormatterWorker.JavaScriptTokensByValue["delete"]=51;FormatterWorker.JavaScriptTokens.TYPEOF=FormatterWorker.JavaScriptTokensByValue["typeof"]=52;FormatterWorker.JavaScriptTokens.VOID=FormatterWorker.JavaScriptTokensByValue["void"]=53;FormatterWorker.JavaScriptTokens.BREAK=FormatterWorker.JavaScriptTokensByValue["break"]=54;FormatterWorker.JavaScriptTokens.CASE=FormatterWorker.JavaScriptTokensByValue["case"]=55;FormatterWorker.JavaScriptTokens.CATCH=FormatterWorker.JavaScriptTokensByValue["catch"]=56;FormatterWorker.JavaScriptTokens.CONTINUE=FormatterWorker.JavaScriptTokensByValue["continue"]=57;FormatterWorker.JavaScriptTokens.DEBUGGER=FormatterWorker.JavaScriptTokensByValue["debugger"]=58;FormatterWorker.JavaScriptTokens.DEFAULT=FormatterWorker.JavaScriptTokensByValue["default"]=59;FormatterWorker.JavaScriptTokens.DO=FormatterWorker.JavaScriptTokensByValue["do"]=60;FormatterWorker.JavaScriptTokens.ELSE=FormatterWorker.JavaScriptTokensByValue["else"]=61;FormatterWorker.JavaScriptTokens.FINALLY=FormatterWorker.JavaScriptTokensByValue["finally"]=62;FormatterWorker.JavaScriptTokens.FOR=FormatterWorker.JavaScriptTokensByValue["for"]=63;FormatterWorker.JavaScriptTokens.FUNCTION=FormatterWorker.JavaScriptTokensByValue["function"]=64;FormatterWorker.JavaScriptTokens.IF=FormatterWorker.JavaScriptTokensByValue["if"]=65;FormatterWorker.JavaScriptTokens.NEW=FormatterWorker.JavaScriptTokensByValue["new"]=66;FormatterWorker.JavaScriptTokens.RETURN=FormatterWorker.JavaScriptTokensByValue["return"]=67;FormatterWorker.JavaScriptTokens.SWITCH=FormatterWorker.JavaScriptTokensByValue["switch"]=68;FormatterWorker.JavaScriptTokens.THIS=FormatterWorker.JavaScriptTokensByValue["this"]=69;FormatterWorker.JavaScriptTokens.THROW=FormatterWorker.JavaScriptTokensByValue["throw"]=70;FormatterWorker.JavaScriptTokens.TRY=FormatterWorker.JavaScriptTokensByValue["try"]=71;FormatterWorker.JavaScriptTokens.VAR=FormatterWorker.JavaScriptTokensByValue["var"]=72;FormatterWorker.JavaScriptTokens.WHILE=FormatterWorker.JavaScriptTokensByValue["while"]=73;FormatterWorker.JavaScriptTokens.WITH=FormatterWorker.JavaScriptTokensByValue["with"]=74;FormatterWorker.JavaScriptTokens.NULL_LITERAL=FormatterWorker.JavaScriptTokensByValue["null"]=75;FormatterWorker.JavaScriptTokens.TRUE_LITERAL=FormatterWorker.JavaScriptTokensByValue["true"]=76;FormatterWorker.JavaScriptTokens.FALSE_LITERAL=FormatterWorker.JavaScriptTokensByValue["false"]=77;FormatterWorker.JavaScriptTokens.NUMBER=78;FormatterWorker.JavaScriptTokens.STRING=79;FormatterWorker.JavaScriptTokens.IDENTIFIER=80;FormatterWorker.JavaScriptTokens.CONST=FormatterWorker.JavaScriptTokensByValue["const"]=81;FormatterWorker.JavaScriptTokensByType={"eof":FormatterWorker.JavaScriptTokens.EOS,"name":FormatterWorker.JavaScriptTokens.IDENTIFIER,"num":FormatterWorker.JavaScriptTokens.NUMBER,"regexp":FormatterWorker.JavaScriptTokens.DIV,"string":FormatterWorker.JavaScriptTokens.STRING};FormatterWorker.JavaScriptTokenizer=function(content)
{this._readNextToken=parse.tokenizer(content);this._state=this._readNextToken.context();}
FormatterWorker.JavaScriptTokenizer.prototype={content:function()
{return this._state.text;},next:function(forceRegexp)
{var uglifyToken=this._readNextToken(forceRegexp);uglifyToken.endPos=this._state.pos;uglifyToken.endLine=this._state.line;uglifyToken.token=this._convertUglifyToken(uglifyToken);return uglifyToken;},_convertUglifyToken:function(uglifyToken)
{var token=FormatterWorker.JavaScriptTokensByType[uglifyToken.type];if(typeof token==="number")
return token;token=FormatterWorker.JavaScriptTokensByValue[uglifyToken.value];if(typeof token==="number")
return token;throw"Unknown token type "+uglifyToken.type;}};FormatterWorker.CSSFormatter=function(content,builder)
{this._content=content;this._builder=builder;this._lastLine=-1;this._state={};}
FormatterWorker.CSSFormatter.prototype={format:function()
{this._lineEndings=this._lineEndings(this._content);var tokenize=FormatterWorker.createTokenizer("text/css");var lines=this._content.split("\n");for(var i=0;i<lines.length;++i){var line=lines[i];tokenize(line,this._tokenCallback.bind(this,i));}
this._builder.flushNewLines(true);},_lineEndings:function(text)
{var lineEndings=[];var i=text.indexOf("\n");while(i!==-1){lineEndings.push(i);i=text.indexOf("\n",i+1);}
lineEndings.push(text.length);return lineEndings;},_tokenCallback:function(startLine,token,type,startColumn)
{if(startLine!==this._lastLine)
this._state.eatWhitespace=true;if(/^property/.test(type)&&!this._state.inPropertyValue)
this._state.seenProperty=true;this._lastLine=startLine;var isWhitespace=/^\s+$/.test(token);if(isWhitespace){if(!this._state.eatWhitespace)
this._builder.addSpace();return;}
this._state.eatWhitespace=false;if(token==="\n")
return;if(token!=="}"){if(this._state.afterClosingBrace)
this._builder.addNewLine();this._state.afterClosingBrace=false;}
var startPosition=(startLine?this._lineEndings[startLine-1]:0)+startColumn;if(token==="}"){if(this._state.inPropertyValue)
this._builder.addNewLine();this._builder.decreaseNestingLevel();this._state.afterClosingBrace=true;this._state.inPropertyValue=false;}else if(token===":"&&!this._state.inPropertyValue&&this._state.seenProperty){this._builder.addToken(token,startPosition,startLine,startColumn);this._builder.addSpace();this._state.eatWhitespace=true;this._state.inPropertyValue=true;this._state.seenProperty=false;return;}else if(token==="{"){this._builder.addSpace();this._builder.addToken(token,startPosition,startLine,startColumn);this._builder.addNewLine();this._builder.increaseNestingLevel();return;}
this._builder.addToken(token,startPosition,startLine,startColumn);if(type==="comment"&&!this._state.inPropertyValue&&!this._state.seenProperty)
this._builder.addNewLine();if(token===";"&&this._state.inPropertyValue){this._state.inPropertyValue=false;this._builder.addNewLine();}else if(token==="}"){this._builder.addNewLine();}}}
FormatterWorker.CSSFormattedContentBuilder=function(content,mapping,originalOffset,formattedOffset,indentString)
{this._originalContent=content;this._originalOffset=originalOffset;this._lastOriginalPosition=0;this._formattedContent=[];this._formattedContentLength=0;this._formattedOffset=formattedOffset;this._lastFormattedPosition=0;this._mapping=mapping;this._lineNumber=0;this._nestingLevel=0;this._needNewLines=0;this._atLineStart=true;this._indentString=indentString;this._cachedIndents={};}
FormatterWorker.CSSFormattedContentBuilder.prototype={addToken:function(token,startPosition,startLine,startColumn)
{if((this._isWhitespaceRun||this._atLineStart)&&/^\s+$/.test(token))
return;if(this._isWhitespaceRun&&this._lineNumber===startLine&&!this._needNewLines)
this._addText(" ");this._isWhitespaceRun=false;this._atLineStart=false;while(this._lineNumber<startLine){this._addText("\n");this._addIndent();this._needNewLines=0;this._lineNumber+=1;this._atLineStart=true;}
if(this._needNewLines){this.flushNewLines();this._addIndent();this._atLineStart=true;}
this._addMappingIfNeeded(startPosition);this._addText(token);this._lineNumber=startLine;},addSpace:function()
{if(this._isWhitespaceRun)
return;this._isWhitespaceRun=true;},addNewLine:function()
{++this._needNewLines;},flushNewLines:function(atLeastOne)
{var newLineCount=atLeastOne&&!this._needNewLines?1:this._needNewLines;if(newLineCount)
this._isWhitespaceRun=false;for(var i=0;i<newLineCount;++i)
this._addText("\n");this._needNewLines=0;},increaseNestingLevel:function()
{this._nestingLevel+=1;},decreaseNestingLevel:function(addNewline)
{if(this._nestingLevel)
this._nestingLevel-=1;if(addNewline)
this.addNewLine();},content:function()
{return this._formattedContent.join("");},_addIndent:function()
{if(this._cachedIndents[this._nestingLevel]){this._addText(this._cachedIndents[this._nestingLevel]);return;}
var fullIndent="";for(var i=0;i<this._nestingLevel;++i)
fullIndent+=this._indentString;this._addText(fullIndent);if(this._nestingLevel<=20)
this._cachedIndents[this._nestingLevel]=fullIndent;},_addText:function(text)
{if(!text)
return;this._formattedContent.push(text);this._formattedContentLength+=text.length;},_addMappingIfNeeded:function(originalPosition)
{if(originalPosition-this._lastOriginalPosition===this._formattedContentLength-this._lastFormattedPosition)
return;this._mapping.original.push(this._originalOffset+originalPosition);this._lastOriginalPosition=originalPosition;this._mapping.formatted.push(this._formattedOffset+this._formattedContentLength);this._lastFormattedPosition=this._formattedContentLength;}};