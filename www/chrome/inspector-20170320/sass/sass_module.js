Sass.SASSSupport={};Sass.SASSSupport.parseSCSS=function(url,content){var text=new Common.Text(content);var document=new Sass.SASSSupport.ASTDocument(url,text);return Common.formatterWorkerPool.parseSCSS(content).then(onParsed);function onParsed(rulePayloads){var rules=[];for(var i=0;i<rulePayloads.length;++i){var rulePayload=rulePayloads[i];var selectors=rulePayload.selectors.map(createTextNode);var properties=rulePayload.properties.map(createProperty);var range=Common.TextRange.fromObject(rulePayload.styleRange);var rule=new Sass.SASSSupport.Rule(document,selectors,range,properties);rules.push(rule);}
return new Sass.SASSSupport.AST(document,rules);}
function createTextNode(payload){var range=Common.TextRange.fromObject(payload);return new Sass.SASSSupport.TextNode(document,text.extract(range),range);}
function createProperty(payload){var name=createTextNode(payload.name);var value=createTextNode(payload.value);return new Sass.SASSSupport.Property(document,name,value,Common.TextRange.fromObject(payload.range),payload.disabled);}};Sass.SASSSupport.ASTDocument=class{constructor(url,text){this.url=url;this.text=text;this.edits=[];}
clone(){return new Sass.SASSSupport.ASTDocument(this.url,this.text);}
hasChanged(){return!!this.edits.length;}
newText(){this.edits.stableSort(sequentialOrder);var text=this.text;for(var i=this.edits.length-1;i>=0;--i){var range=this.edits[i].oldRange;var newText=this.edits[i].newText;text=new Common.Text(text.replaceRange(range,newText));}
return text;function sequentialOrder(edit1,edit2){var range1=edit1.oldRange.collapseToStart();var range2=edit2.oldRange.collapseToStart();if(range1.equal(range2))
return 0;return range1.follows(range2)?1:-1;}}};Sass.SASSSupport.Node=class{constructor(document){this.document=document;}};Sass.SASSSupport.TextNode=class extends Sass.SASSSupport.Node{constructor(document,text,range){super(document);this.text=text;this.range=range;}
setText(newText){if(this.text===newText)
return;this.text=newText;this.document.edits.push(new Common.SourceEdit(this.document.url,this.range,newText));}
clone(document){return new Sass.SASSSupport.TextNode(document,this.text,this.range.clone());}
match(other,outNodeMapping){if(this.text.trim()!==other.text.trim())
return false;if(outNodeMapping)
outNodeMapping.set(this,other);return true;}};Sass.SASSSupport.Property=class extends Sass.SASSSupport.Node{constructor(document,name,value,range,disabled){super(document);this.name=name;this.value=value;this.range=range;this.name.parent=this;this.value.parent=this;this.disabled=disabled;}
clone(document){return new Sass.SASSSupport.Property(document,this.name.clone(document),this.value.clone(document),this.range.clone(),this.disabled);}
visit(callback){callback(this);callback(this.name);callback(this.value);}
match(other,outNodeMapping){if(this.disabled!==other.disabled)
return false;if(outNodeMapping)
outNodeMapping.set(this,other);return this.name.match(other.name,outNodeMapping)&&this.value.match(other.value,outNodeMapping);}
setDisabled(disabled){if(this.disabled===disabled)
return;this.disabled=disabled;if(disabled){var oldRange1=Common.TextRange.createFromLocation(this.range.startLine,this.range.startColumn);var edit1=new Common.SourceEdit(this.document.url,oldRange1,'/* ');var oldRange2=Common.TextRange.createFromLocation(this.range.endLine,this.range.endColumn);var edit2=new Common.SourceEdit(this.document.url,oldRange2,' */');this.document.edits.push(edit1,edit2);return;}
var oldRange1=new Common.TextRange(this.range.startLine,this.range.startColumn,this.range.startLine,this.name.range.startColumn);var edit1=new Common.SourceEdit(this.document.url,oldRange1,'');var propertyText=this.document.text.extract(this.range);var endsWithSemicolon=propertyText.slice(0,-2).trim().endsWith(';');var oldRange2=new Common.TextRange(this.range.endLine,this.value.range.endColumn+(endsWithSemicolon?1:0),this.range.endLine,this.range.endColumn);var edit2=new Common.SourceEdit(this.document.url,oldRange2,'');this.document.edits.push(edit1,edit2);}
remove(){console.assert(this.parent);var rule=this.parent;var index=rule.properties.indexOf(this);rule.properties.splice(index,1);this.parent=null;var lineRange=new Common.TextRange(this.range.startLine,0,this.range.endLine+1,0);var oldRange;if(this.document.text.extract(lineRange).trim()===this.document.text.extract(this.range).trim())
oldRange=lineRange;else
oldRange=this.range;this.document.edits.push(new Common.SourceEdit(this.document.url,oldRange,''));}};Sass.SASSSupport.Rule=class extends Sass.SASSSupport.Node{constructor(document,selectors,styleRange,properties){super(document);this.selectors=selectors;this.properties=properties;this.styleRange=styleRange;var blockStartRange=styleRange.collapseToStart();blockStartRange.startColumn-=1;this.blockStart=new Sass.SASSSupport.TextNode(document,this.document.text.extract(blockStartRange),blockStartRange);this.blockStart.parent=this;for(var i=0;i<this.properties.length;++i)
this.properties[i].parent=this;this._hasTrailingSemicolon=!this.properties.length||this.document.text.extract(this.properties.peekLast().range).endsWith(';');}
clone(document){var properties=[];for(var i=0;i<this.properties.length;++i)
properties.push(this.properties[i].clone(document));var selectors=[];for(var i=0;i<this.selectors.length;++i)
selectors.push(this.selectors[i].clone(document));return new Sass.SASSSupport.Rule(document,selectors,this.styleRange.clone(),properties);}
visit(callback){callback(this);for(var i=0;i<this.selectors.length;++i)
callback(this.selectors[i]);callback(this.blockStart);for(var i=0;i<this.properties.length;++i)
this.properties[i].visit(callback);}
match(other,outNodeMapping){if(this.selectors.length!==other.selectors.length)
return false;if(this.properties.length!==other.properties.length)
return false;if(outNodeMapping)
outNodeMapping.set(this,other);var result=this.blockStart.match(other.blockStart,outNodeMapping);for(var i=0;result&&i<this.selectors.length;++i)
result=result&&this.selectors[i].match(other.selectors[i],outNodeMapping);for(var i=0;result&&i<this.properties.length;++i)
result=result&&this.properties[i].match(other.properties[i],outNodeMapping);return result;}
_addTrailingSemicolon(){if(this._hasTrailingSemicolon||!this.properties)
return;this._hasTrailingSemicolon=true;this.document.edits.push(new Common.SourceEdit(this.document.url,this.properties.peekLast().range.collapseToEnd(),';'));}
insertProperties(anchorProperty,nameTexts,valueTexts,disabledStates){console.assert(nameTexts.length===valueTexts.length&&valueTexts.length===disabledStates.length,'Input array should be of the same size.');this._addTrailingSemicolon();var newProperties=[];var index=anchorProperty?this.properties.indexOf(anchorProperty):-1;for(var i=0;i<nameTexts.length;++i){var nameText=nameTexts[i];var valueText=valueTexts[i];var disabled=disabledStates[i];this.document.edits.push(this._insertPropertyEdit(anchorProperty,nameText,valueText,disabled));var name=new Sass.SASSSupport.TextNode(this.document,nameText,Common.TextRange.createFromLocation(0,0));var value=new Sass.SASSSupport.TextNode(this.document,valueText,Common.TextRange.createFromLocation(0,0));var newProperty=new Sass.SASSSupport.Property(this.document,name,value,Common.TextRange.createFromLocation(0,0),disabled);this.properties.splice(index+i+1,0,newProperty);newProperty.parent=this;newProperties.push(newProperty);}
return newProperties;}
_insertPropertyEdit(anchorProperty,nameText,valueText,disabled){var anchorRange=anchorProperty?anchorProperty.range:this.blockStart.range;var indent=this._computePropertyIndent();var leftComment=disabled?'/* ':'';var rightComment=disabled?' */':'';var newText=String.sprintf('\n%s%s%s: %s;%s',indent,leftComment,nameText,valueText,rightComment);return new Common.SourceEdit(this.document.url,anchorRange.collapseToEnd(),newText);}
_computePropertyIndent(){var indentProperty=this.properties.find(property=>!property.range.isEmpty());var result='';if(indentProperty){result=this.document.text.extract(new Common.TextRange(indentProperty.range.startLine,0,indentProperty.range.startLine,indentProperty.range.startColumn));}else{var lineNumber=this.blockStart.range.startLine;var columnNumber=this.blockStart.range.startColumn;var baseLine=this.document.text.extract(new Common.TextRange(lineNumber,0,lineNumber,columnNumber));result=Common.TextUtils.lineIndent(baseLine)+Common.moduleSetting('textEditorIndent').get();}
return result.isWhitespace()?result:'';}};Sass.SASSSupport.AST=class extends Sass.SASSSupport.Node{constructor(document,rules){super(document);this.rules=rules;for(var i=0;i<rules.length;++i)
rules[i].parent=this;}
clone(){var document=this.document.clone();var rules=[];for(var i=0;i<this.rules.length;++i)
rules.push(this.rules[i].clone(document));return new Sass.SASSSupport.AST(document,rules);}
match(other,outNodeMapping){if(other.document.url!==this.document.url)
return false;if(other.rules.length!==this.rules.length)
return false;if(outNodeMapping)
outNodeMapping.set(this,other);var result=true;for(var i=0;result&&i<this.rules.length;++i)
result=result&&this.rules[i].match(other.rules[i],outNodeMapping);return result;}
visit(callback){callback(this);for(var i=0;i<this.rules.length;++i)
this.rules[i].visit(callback);}
findNodeForPosition(lineNumber,columnNumber){this._ensureNodePositionsIndex();var index=this._sortedTextNodes.lowerBound({lineNumber:lineNumber,columnNumber:columnNumber},nodeComparator);var node=this._sortedTextNodes[index];if(!node)
return null;return node.range.containsLocation(lineNumber,columnNumber)?node:null;function nodeComparator(position,textNode){return textNode.range.compareToPosition(position.lineNumber,position.columnNumber);}}
_ensureNodePositionsIndex(){if(this._sortedTextNodes)
return;this._sortedTextNodes=[];this.visit(onNode.bind(this));this._sortedTextNodes.sort(nodeComparator);function onNode(node){if(!(node instanceof Sass.SASSSupport.TextNode))
return;this._sortedTextNodes.push(node);}
function nodeComparator(text1,text2){return Common.TextRange.comparator(text1.range,text2.range);}}};Sass.SASSSupport.PropertyChangeType={PropertyAdded:'PropertyAdded',PropertyRemoved:'PropertyRemoved',PropertyToggled:'PropertyToggled',ValueChanged:'ValueChanged',NameChanged:'NameChanged'};Sass.SASSSupport.PropertyChange=class{constructor(type,oldRule,newRule,oldPropertyIndex,newPropertyIndex){this.type=type;this.oldRule=oldRule;this.newRule=newRule;this.oldPropertyIndex=oldPropertyIndex;this.newPropertyIndex=newPropertyIndex;}
oldProperty(){return this.oldRule.properties[this.oldPropertyIndex]||null;}
newProperty(){return this.newRule.properties[this.newPropertyIndex]||null;}};Sass.SASSSupport.ASTDiff=class{constructor(url,oldAST,newAST,mapping,changes){this.url=url;this.mapping=mapping;this.changes=changes;this.oldAST=oldAST;this.newAST=newAST;}};Sass.SASSSupport.diffModels=function(oldAST,newAST){console.assert(oldAST.rules.length===newAST.rules.length,'Not implemented for rule diff.');console.assert(oldAST.document.url===newAST.document.url,'Diff makes sense for models with the same url.');var T=Sass.SASSSupport.PropertyChangeType;var changes=[];var mapping=new Map();for(var i=0;i<oldAST.rules.length;++i){var oldRule=oldAST.rules[i];var newRule=newAST.rules[i];computeRuleDiff(mapping,oldRule,newRule);}
return new Sass.SASSSupport.ASTDiff(oldAST.document.url,oldAST,newAST,mapping,changes);function addChange(type,oldRule,newRule,oldPropertyIndex,newPropertyIndex){changes.push(new Sass.SASSSupport.PropertyChange(type,oldRule,newRule,oldPropertyIndex,newPropertyIndex));}
function computeRuleDiff(mapping,oldRule,newRule){var oldLines=[];for(var i=0;i<oldRule.properties.length;++i)
oldLines.push(oldRule.properties[i].name.text.trim()+':'+oldRule.properties[i].value.text.trim());var newLines=[];for(var i=0;i<newRule.properties.length;++i)
newLines.push(newRule.properties[i].name.text.trim()+':'+newRule.properties[i].value.text.trim());var diff=Diff.Diff.lineDiff(oldLines,newLines);diff=Diff.Diff.convertToEditDiff(diff);var p1=0,p2=0;for(var i=0;i<diff.length;++i){var token=diff[i];if(token[0]===Diff.Diff.Operation.Delete){for(var j=0;j<token[1];++j)
addChange(T.PropertyRemoved,oldRule,newRule,p1++,p2);}else if(token[0]===Diff.Diff.Operation.Insert){for(var j=0;j<token[1];++j)
addChange(T.PropertyAdded,oldRule,newRule,p1,p2++);}else{for(var j=0;j<token[1];++j)
computePropertyDiff(mapping,oldRule,newRule,p1++,p2++);}}}
function computePropertyDiff(mapping,oldRule,newRule,oldPropertyIndex,newPropertyIndex){var oldProperty=oldRule.properties[oldPropertyIndex];var newProperty=newRule.properties[newPropertyIndex];mapping.set(oldProperty.name,newProperty.name);mapping.set(oldProperty.value,newProperty.value);if(oldProperty.name.text.trim()!==newProperty.name.text.trim())
addChange(T.NameChanged,oldRule,newRule,oldPropertyIndex,newPropertyIndex);if(oldProperty.value.text.trim()!==newProperty.value.text.trim())
addChange(T.ValueChanged,oldRule,newRule,oldPropertyIndex,newPropertyIndex);if(oldProperty.disabled!==newProperty.disabled)
addChange(T.PropertyToggled,oldRule,newRule,oldPropertyIndex,newPropertyIndex);}};;Sass.ASTService=class{parseCSS(url,text){return Sass.SASSSupport.parseSCSS(url,text);}
parseSCSS(url,text){return Sass.SASSSupport.parseSCSS(url,text);}};;Sass.SASSProcessor=class{constructor(astService,map,editOperations){this._astService=astService;this._map=map;this._editOperations=editOperations;}
static _toSASSProperty(map,cssProperty){var sassName=map.toSourceNode(cssProperty.name);return sassName?sassName.parent:null;}
static _toCSSProperties(map,sassProperty){return map.toCompiledNodes(sassProperty.name).map(name=>name.parent);}
static processCSSEdits(astService,map,ranges,newTexts){console.assert(ranges.length===newTexts.length);var cssURL=map.compiledURL();var cssText=map.compiledModel().document.text;for(var i=0;i<ranges.length;++i)
cssText=new Common.Text(cssText.replaceRange(ranges[i],newTexts[i]));return astService.parseCSS(cssURL,cssText.value()).then(onCSSParsed);function onCSSParsed(newCSSAST){if(newCSSAST.rules.length!==map.compiledModel().rules.length)
return Promise.resolve((null));var cssDiff=Sass.SASSSupport.diffModels(map.compiledModel(),newCSSAST);var edits=Sass.SASSProcessor._editsFromCSSDiff(cssDiff,map);var changedURLs=new Set(edits.map(edit=>edit.sassURL));changedURLs.add(map.compiledURL());var clonedModels=[];for(var url of changedURLs)
clonedModels.push(map.modelForURL(url).clone());var nodeMapping=new Map();var rebasedMap=(map.rebase(clonedModels,nodeMapping));console.assert(rebasedMap);var rebasedEdits=edits.map(edit=>edit.rebase(rebasedMap,nodeMapping));return new Sass.SASSProcessor(astService,rebasedMap,rebasedEdits)._mutate();}}
static _editsFromCSSDiff(cssDiff,map){var T=Sass.SASSSupport.PropertyChangeType;var operations=[];for(var i=0;i<cssDiff.changes.length;++i){var change=cssDiff.changes[i];var operation=null;if(change.type===T.ValueChanged||change.type===T.NameChanged)
operation=Sass.SASSProcessor.SetTextOperation.fromCSSChange(change,map);else if(change.type===T.PropertyToggled)
operation=Sass.SASSProcessor.TogglePropertyOperation.fromCSSChange(change,map);else if(change.type===T.PropertyRemoved)
operation=Sass.SASSProcessor.RemovePropertyOperation.fromCSSChange(change,map);else if(change.type===T.PropertyAdded)
operation=Sass.SASSProcessor.InsertPropertiesOperation.fromCSSChange(change,map);if(!operation){Common.console.error('Operation ignored: '+change.type);continue;}
var merged=false;for(var j=0;!merged&&j<operations.length;++j)
merged=operations[j].merge(operation);if(!merged)
operations.push(operation);}
return operations;}
_mutate(){var changedCSSRules=new Set();for(var editOperation of this._editOperations){var rules=editOperation.perform();changedCSSRules.addAll(rules);}
var promises=[];for(var ast of this._map.models().values()){if(!ast.document.hasChanged())
continue;var promise;if(ast.document.url===this._map.compiledURL())
promise=this._astService.parseCSS(ast.document.url,ast.document.newText().value());else
promise=this._astService.parseSCSS(ast.document.url,ast.document.newText().value());promises.push(promise);}
return Promise.all(promises).then(this._onFinished.bind(this,changedCSSRules));}
_onFinished(changedCSSRules,changedModels){var nodeMapping=new Map();var map=this._map.rebase(changedModels,nodeMapping);if(!map)
return null;var cssEdits=[];for(var rule of changedCSSRules){var oldRange=rule.styleRange;var newRule=nodeMapping.get(rule);var newText=newRule.document.text.extract(newRule.styleRange);cssEdits.push(new Common.SourceEdit(newRule.document.url,oldRange,newText));}
var newSASSSources=new Map();for(var model of changedModels){if(model.document.url===map.compiledURL())
continue;newSASSSources.set(model.document.url,model.document.text.value());}
return new SDK.SourceMap.EditResult(map,cssEdits,newSASSSources);}};Sass.SASSProcessor.EditOperation=class{constructor(map,sassURL){this.map=map;this.sassURL=sassURL;}
merge(other){return false;}
perform(){return[];}
rebase(newMap,nodeMapping){return this;}};Sass.SASSProcessor.SetTextOperation=class extends Sass.SASSProcessor.EditOperation{constructor(map,sassNode,newText){super(map,sassNode.document.url);this._sassNode=sassNode;this._newText=newText;}
static fromCSSChange(change,map){var oldProperty=(change.oldProperty());var newProperty=(change.newProperty());console.assert(oldProperty&&newProperty,'SetTextOperation must have both oldProperty and newProperty');var newValue=null;var sassNode=null;if(change.type===Sass.SASSSupport.PropertyChangeType.NameChanged){newValue=newProperty.name.text;sassNode=map.toSourceNode(oldProperty.name);}else{newValue=newProperty.value.text;sassNode=map.toSourceNode(oldProperty.value);}
if(!sassNode)
return null;return new Sass.SASSProcessor.SetTextOperation(map,sassNode,newValue);}
merge(other){if(!(other instanceof Sass.SASSProcessor.SetTextOperation))
return false;return this._sassNode===other._sassNode;}
perform(){this._sassNode.setText(this._newText);var nodes=this.map.toCompiledNodes(this._sassNode);for(var node of nodes)
node.setText(this._newText);var cssRules=nodes.map(textNode=>textNode.parent.parent);return cssRules;}
rebase(newMap,nodeMapping){var sassNode=(nodeMapping.get(this._sassNode))||this._sassNode;return new Sass.SASSProcessor.SetTextOperation(newMap,sassNode,this._newText);}};Sass.SASSProcessor.TogglePropertyOperation=class extends Sass.SASSProcessor.EditOperation{constructor(map,sassProperty,newDisabled){super(map,sassProperty.document.url);this._sassProperty=sassProperty;this._newDisabled=newDisabled;}
static fromCSSChange(change,map){var oldCSSProperty=(change.oldProperty());console.assert(oldCSSProperty,'TogglePropertyOperation must have old CSS property');var sassProperty=Sass.SASSProcessor._toSASSProperty(map,oldCSSProperty);if(!sassProperty)
return null;var newDisabled=change.newProperty().disabled;return new Sass.SASSProcessor.TogglePropertyOperation(map,sassProperty,newDisabled);}
merge(other){if(!(other instanceof Sass.SASSProcessor.TogglePropertyOperation))
return false;return this._sassProperty===other._sassProperty;}
perform(){this._sassProperty.setDisabled(this._newDisabled);var cssProperties=Sass.SASSProcessor._toCSSProperties(this.map,this._sassProperty);for(var property of cssProperties)
property.setDisabled(this._newDisabled);var cssRules=cssProperties.map(property=>property.parent);return cssRules;}
rebase(newMap,nodeMapping){var sassProperty=(nodeMapping.get(this._sassProperty))||this._sassProperty;return new Sass.SASSProcessor.TogglePropertyOperation(newMap,sassProperty,this._newDisabled);}};Sass.SASSProcessor.RemovePropertyOperation=class extends Sass.SASSProcessor.EditOperation{constructor(map,sassProperty){super(map,sassProperty.document.url);this._sassProperty=sassProperty;}
static fromCSSChange(change,map){var removedProperty=(change.oldProperty());console.assert(removedProperty,'RemovePropertyOperation must have removed CSS property');var sassProperty=Sass.SASSProcessor._toSASSProperty(map,removedProperty);if(!sassProperty)
return null;return new Sass.SASSProcessor.RemovePropertyOperation(map,sassProperty);}
merge(other){if(!(other instanceof Sass.SASSProcessor.RemovePropertyOperation))
return false;return this._sassProperty===other._sassProperty;}
perform(){var cssProperties=Sass.SASSProcessor._toCSSProperties(this.map,this._sassProperty);var cssRules=cssProperties.map(property=>property.parent);this._sassProperty.remove();for(var cssProperty of cssProperties){cssProperty.remove();this.map.removeMapping(cssProperty.name,this._sassProperty.name);this.map.removeMapping(cssProperty.value,this._sassProperty.value);}
return cssRules;}
rebase(newMap,nodeMapping){var sassProperty=(nodeMapping.get(this._sassProperty))||this._sassProperty;return new Sass.SASSProcessor.RemovePropertyOperation(newMap,sassProperty);}};Sass.SASSProcessor.InsertPropertiesOperation=class extends Sass.SASSProcessor.EditOperation{constructor(map,sassRule,afterSASSProperty,propertyNames,propertyValues,disabledStates){console.assert(propertyNames.length===propertyValues.length&&propertyValues.length===disabledStates.length);super(map,sassRule.document.url);this._sassRule=sassRule;this._afterSASSProperty=afterSASSProperty;this._nameTexts=propertyNames;this._valueTexts=propertyValues;this._disabledStates=disabledStates;}
static fromCSSChange(change,map){var sassRule=null;var afterSASSProperty=null;if(change.oldPropertyIndex){var cssAnchor=change.oldRule.properties[change.oldPropertyIndex-1].name;var sassAnchor=map.toSourceNode(cssAnchor);afterSASSProperty=sassAnchor?sassAnchor.parent:null;sassRule=afterSASSProperty?afterSASSProperty.parent:null;}else{var cssAnchor=change.oldRule.blockStart;var sassAnchor=map.toSourceNode(cssAnchor);sassRule=sassAnchor?sassAnchor.parent:null;}
if(!sassRule)
return null;var insertedProperty=(change.newProperty());console.assert(insertedProperty,'InsertPropertiesOperation must have inserted CSS property');var names=[insertedProperty.name.text];var values=[insertedProperty.value.text];var disabledStates=[insertedProperty.disabled];return new Sass.SASSProcessor.InsertPropertiesOperation(map,sassRule,afterSASSProperty,names,values,disabledStates);}
merge(other){if(!(other instanceof Sass.SASSProcessor.InsertPropertiesOperation))
return false;if(this._sassRule!==other._sassRule||this._afterSASSProperty!==other._afterSASSProperty)
return false;var names=new Set(this._nameTexts);for(var i=0;i<other._nameTexts.length;++i){var nameText=other._nameTexts[i];if(names.has(nameText))
continue;this._nameTexts.push(nameText);this._valueTexts.push(other._valueTexts[i]);this._disabledStates.push(other._disabledStates[i]);}
return true;}
perform(){var newSASSProperties=this._sassRule.insertProperties(this._afterSASSProperty,this._nameTexts,this._valueTexts,this._disabledStates);var cssRules=[];var afterCSSProperties=[];if(this._afterSASSProperty){afterCSSProperties=Sass.SASSProcessor._toCSSProperties(this.map,this._afterSASSProperty);cssRules=afterCSSProperties.map(property=>property.parent);}else{cssRules=this.map.toCompiledNodes(this._sassRule.blockStart).map(blockStart=>blockStart.parent);}
for(var i=0;i<cssRules.length;++i){var cssRule=cssRules[i];var afterCSSProperty=afterCSSProperties.length?afterCSSProperties[i]:null;var newCSSProperties=cssRule.insertProperties(afterCSSProperty,this._nameTexts,this._valueTexts,this._disabledStates);for(var j=0;j<newCSSProperties.length;++j){this.map.addMapping(newCSSProperties[j].name,newSASSProperties[j].name);this.map.addMapping(newCSSProperties[j].value,newSASSProperties[j].value);}}
return cssRules;}
rebase(newMap,nodeMapping){var sassRule=(nodeMapping.get(this._sassRule))||this._sassRule;var afterSASSProperty=this._afterSASSProperty?(nodeMapping.get(this._afterSASSProperty))||this._afterSASSProperty:null;return new Sass.SASSProcessor.InsertPropertiesOperation(newMap,sassRule,afterSASSProperty,this._nameTexts,this._valueTexts,this._disabledStates);}};;Sass.ASTSourceMap=class{constructor(compiledURL,sourceMapURL,models,editCallback){this._editCallback=editCallback;this._compiledURL=compiledURL;this._sourceMapURL=sourceMapURL;this._models=models;this._compiledToSource=new Map();this._sourceToCompiled=new Multimap();}
compiledURL(){return this._compiledURL;}
url(){return this._sourceMapURL;}
sourceURLs(){return this._models.keysArray().filter(url=>url!==this._compiledURL);}
sourceContentProvider(sourceURL,contentType){var model=this.modelForURL(sourceURL);var sourceContent=model?model.document.text.value():'';return Common.StaticContentProvider.fromString(sourceURL,contentType,sourceContent);}
embeddedContentByURL(sourceURL){var model=this.modelForURL(sourceURL);return model?model.document.text.value():'';}
findEntry(lineNumber,columnNumber){columnNumber=columnNumber||0;var compiledNode=this.compiledModel().findNodeForPosition(lineNumber,columnNumber);if(!compiledNode)
return null;var sourceNode=this.toSourceNode(compiledNode);if(!sourceNode)
return null;return new SDK.SourceMapEntry(lineNumber,columnNumber,sourceNode.document.url,sourceNode.range.startLine,sourceNode.range.startColumn);}
editable(){return!!this._editCallback;}
editCompiled(ranges,texts){return this._editCallback.call(null,this,ranges,texts);}
compiledModel(){return(this._models.get(this._compiledURL));}
sourceModels(){var sourceModels=(new Map(this._models));sourceModels.delete(this._compiledURL);return sourceModels;}
models(){return(new Map(this._models));}
modelForURL(url){return this._models.get(url)||null;}
addMapping(compiled,source){this._compiledToSource.set(compiled,source);this._sourceToCompiled.set(source,compiled);}
removeMapping(compiled,source){this._compiledToSource.delete(compiled);this._sourceToCompiled.remove(source,compiled);}
toSourceNode(compiled){return this._compiledToSource.get(compiled)||null;}
toCompiledNodes(source){var compiledNodes=this._sourceToCompiled.get(source);return compiledNodes?compiledNodes.valuesArray():[];}
rebase(updated,outNodeMapping){outNodeMapping=outNodeMapping||new Map();outNodeMapping.clear();var models=(new Map(this._models));for(var newAST of updated){var oldAST=models.get(newAST.document.url);if(!oldAST.match(newAST,outNodeMapping))
return null;models.set(newAST.document.url,newAST);}
var newMap=new Sass.ASTSourceMap(this._compiledURL,this._sourceMapURL,models,this._editCallback);var compiledNodes=this._compiledToSource.keysArray();for(var i=0;i<compiledNodes.length;++i){var compiledNode=compiledNodes[i];var sourceNode=(this._compiledToSource.get(compiledNode));var mappedCompiledNode=(outNodeMapping.get(compiledNode)||compiledNode);var mappedSourceNode=(outNodeMapping.get(sourceNode)||sourceNode);newMap.addMapping(mappedCompiledNode,mappedSourceNode);}
return newMap;}};;Sass.SASSSourceMapFactory=class{constructor(){this._astService=new Sass.ASTService();}
editableSourceMap(target,sourceMap){var cssModel=target.model(SDK.CSSModel);if(!cssModel)
return Promise.resolve((null));var header=cssModel.styleSheetHeaders().find(styleSheetHeader=>styleSheetHeader.sourceMapURL===sourceMap.url());if(!header)
return Promise.resolve((null));var models=new Map();var promises=[];for(let url of sourceMap.sourceURLs()){var contentProvider=sourceMap.sourceContentProvider(url,Common.resourceTypes.SourceMapStyleSheet);var sassPromise=contentProvider.requestContent().then(text=>this._astService.parseSCSS(url,text||'')).then(ast=>models.set(ast.document.url,ast));promises.push(sassPromise);}
var cssURL=sourceMap.compiledURL();var cssPromise=header.originalContentProvider().requestContent().then(text=>this._astService.parseCSS(cssURL,text||'')).then(ast=>models.set(ast.document.url,ast));promises.push(cssPromise);return Promise.all(promises).then(this._onSourcesParsed.bind(this,sourceMap,models)).catchException((null));}
_onSourcesParsed(sourceMap,models){var editCallback=Sass.SASSProcessor.processCSSEdits.bind(Sass.SASSProcessor,this._astService);var map=new Sass.ASTSourceMap(sourceMap.compiledURL(),sourceMap.url(),models,editCallback);var valid=true;map.compiledModel().visit(onNode);return valid?map:null;function onNode(cssNode){if(!valid)
return;if(!(cssNode instanceof Sass.SASSSupport.TextNode))
return;var entry=sourceMap.findEntry(cssNode.range.startLine,cssNode.range.startColumn);if(!entry||!entry.sourceURL||typeof entry.sourceLineNumber==='undefined'||typeof entry.sourceColumnNumber==='undefined')
return;var sassAST=models.get(entry.sourceURL);if(!sassAST)
return;var sassNode=sassAST.findNodeForPosition(entry.sourceLineNumber,entry.sourceColumnNumber);if(!sassNode)
return;if(cssNode.parent&&(cssNode.parent instanceof Sass.SASSSupport.Property)&&cssNode===cssNode.parent.name&&cssNode.text.trim()!==sassNode.text.trim()){valid=false;reportError(cssNode,sassNode);return;}
map.addMapping(cssNode,sassNode);}
function reportError(cssNode,sassNode){var text=Common.UIString('LiveSASS failed to start: %s',sourceMap.url());text+=Common.UIString('\nSourceMap is misaligned: %s != %s',cssNode.text.trim(),sassNode.text.trim());text+='\ncompiled: '+cssNode.document.url+':'+(cssNode.range.startLine+1)+':'+
(cssNode.range.startColumn+1);text+='\nsource: '+sassNode.document.url+':'+(sassNode.range.startLine+1)+':'+
(sassNode.range.startColumn+1);Common.console.error(text);}}};;