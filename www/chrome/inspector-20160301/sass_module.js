WebInspector.SASSSupport={}
WebInspector.SASSSupport.parseCSS=function(cssParserService,url,text)
{return cssParserService.parseCSS(text).then(onParsed);function onParsed(parsedCSS)
{var document=new WebInspector.SASSSupport.ASTDocument(url,text);var rules=[];for(var i=0;i<parsedCSS.length;++i){var rule=parsedCSS[i];if(!rule.properties)
continue;var properties=[];for(var j=0;j<rule.properties.length;++j){var cssProperty=rule.properties[j];var name=new WebInspector.SASSSupport.TextNode(document,cssProperty.name,WebInspector.TextRange.fromObject(cssProperty.nameRange));var value=new WebInspector.SASSSupport.TextNode(document,cssProperty.value,WebInspector.TextRange.fromObject(cssProperty.valueRange));var property=new WebInspector.SASSSupport.Property(document,name,value,WebInspector.TextRange.fromObject(cssProperty.range),!!cssProperty.disabled);properties.push(property);}
rules.push(new WebInspector.SASSSupport.Rule(document,rule.selectorText,WebInspector.TextRange.fromObject(rule.styleRange),properties));}
return new WebInspector.SASSSupport.AST(document,rules);}}
WebInspector.SASSSupport.parseSCSS=function(tokenizerFactory,url,text)
{var document=new WebInspector.SASSSupport.ASTDocument(url,text);var result=WebInspector.SASSSupport._innerParseSCSS(document,tokenizerFactory);var rules=[new WebInspector.SASSSupport.Rule(document,"variables",WebInspector.TextRange.createFromLocation(0,0),result.variables),new WebInspector.SASSSupport.Rule(document,"properties",WebInspector.TextRange.createFromLocation(0,0),result.properties),new WebInspector.SASSSupport.Rule(document,"mixins",WebInspector.TextRange.createFromLocation(0,0),result.mixins)];return new WebInspector.SASSSupport.AST(document,rules);}
WebInspector.SASSSupport.SCSSParserStates={Initial:"Initial",PropertyName:"PropertyName",PropertyValue:"PropertyValue",VariableName:"VariableName",VariableValue:"VariableValue",MixinName:"MixinName",MixinValue:"MixinValue",Media:"Media"}
WebInspector.SASSSupport._innerParseSCSS=function(document,tokenizerFactory)
{var lines=document.text.split("\n");var properties=[];var variables=[];var mixins=[];var States=WebInspector.SASSSupport.SCSSParserStates;var state=States.Initial;var propertyName,propertyValue;var variableName,variableValue;var mixinName,mixinValue;var UndefTokenType={};function processToken(tokenValue,tokenTypes,column,newColumn)
{var tokenType=tokenTypes?tokenTypes.split(" ").keySet():UndefTokenType;switch(state){case States.Initial:if(tokenType["css-variable-2"]){variableName=new WebInspector.SASSSupport.TextNode(document,tokenValue,new WebInspector.TextRange(lineNumber,column,lineNumber,newColumn));state=States.VariableName;}else if(tokenType["css-property"]||tokenType["css-meta"]){propertyName=new WebInspector.SASSSupport.TextNode(document,tokenValue,new WebInspector.TextRange(lineNumber,column,lineNumber,newColumn));state=States.PropertyName;}else if(tokenType["css-def"]&&tokenValue==="@include"){mixinName=new WebInspector.SASSSupport.TextNode(document,tokenValue,new WebInspector.TextRange(lineNumber,column,lineNumber,newColumn));state=States.MixinName;}else if(tokenType["css-comment"]){if(tokenValue.substring(0,2)!=="/*"||tokenValue.substring(tokenValue.length-2)!=="*/")
break;var uncommentedText=tokenValue.substring(2,tokenValue.length-2);var fakeRuleText="a{\n"+uncommentedText+"}";var fakeDocument=new WebInspector.SASSSupport.ASTDocument("",fakeRuleText);var result=WebInspector.SASSSupport._innerParseSCSS(fakeDocument,tokenizerFactory);if(result.properties.length===1&&result.variables.length===0&&result.mixins.length===0){var disabledProperty=result.properties[0];var offset=column+2;var nameRange=new WebInspector.TextRange(lineNumber,disabledProperty.name.range.startColumn+offset,lineNumber,disabledProperty.name.range.endColumn+offset);var valueRange=new WebInspector.TextRange(lineNumber,disabledProperty.value.range.startColumn+offset,lineNumber,disabledProperty.value.range.endColumn+offset);var name=new WebInspector.SASSSupport.TextNode(document,disabledProperty.name.text,nameRange);var value=new WebInspector.SASSSupport.TextNode(document,disabledProperty.value.text,valueRange);var range=new WebInspector.TextRange(lineNumber,column,lineNumber,newColumn);var property=new WebInspector.SASSSupport.Property(document,name,value,range,true);properties.push(property);}}else if(tokenType["css-def"]&&tokenValue==="@media"){state=States.Media;}
break;case States.VariableName:if(tokenValue==="}"&&tokenType===UndefTokenType){state=States.Initial;}else if(tokenValue===")"&&tokenType===UndefTokenType){state=States.Initial;}else if(tokenValue===":"&&tokenType===UndefTokenType){state=States.VariableValue;variableValue=new WebInspector.SASSSupport.TextNode(document,"",WebInspector.TextRange.createFromLocation(lineNumber,newColumn));}else if(tokenType!==UndefTokenType){state=States.Initial;}
break;case States.VariableValue:if(tokenValue===";"&&tokenType===UndefTokenType){variableValue.range.endLine=lineNumber;variableValue.range.endColumn=column;var variable=new WebInspector.SASSSupport.Property(document,variableName,variableValue,variableName.range.clone(),false);variable.range.endLine=lineNumber;variable.range.endColumn=newColumn;variables.push(variable);state=States.Initial;}else{variableValue.text+=tokenValue;}
break;case States.PropertyName:if(tokenValue===":"&&tokenType===UndefTokenType){state=States.PropertyValue;propertyName.range.endLine=lineNumber;propertyName.range.endColumn=column;propertyValue=new WebInspector.SASSSupport.TextNode(document,"",WebInspector.TextRange.createFromLocation(lineNumber,newColumn));}else if(tokenType["css-property"]){propertyName.text+=tokenValue;}
break;case States.PropertyValue:if((tokenValue==="}"||tokenValue===";")&&tokenType===UndefTokenType){propertyValue.range.endLine=lineNumber;propertyValue.range.endColumn=column;var property=new WebInspector.SASSSupport.Property(document,propertyName,propertyValue,propertyName.range.clone(),false);property.range.endLine=lineNumber;property.range.endColumn=newColumn;properties.push(property);state=States.Initial;}else{propertyValue.text+=tokenValue;}
break;case States.MixinName:if(tokenValue==="("&&tokenType===UndefTokenType){state=States.MixinValue;mixinName.range.endLine=lineNumber;mixinName.range.endColumn=column;mixinValue=new WebInspector.SASSSupport.TextNode(document,"",WebInspector.TextRange.createFromLocation(lineNumber,newColumn));}else if(tokenValue===";"&&tokenType===UndefTokenType){state=States.Initial;mixinValue=null;}else{mixinName.text+=tokenValue;}
break;case States.MixinValue:if(tokenValue===")"&&tokenType===UndefTokenType){mixinValue.range.endLine=lineNumber;mixinValue.range.endColumn=column;var mixin=new WebInspector.SASSSupport.Property(document,mixinName,(mixinValue),mixinName.range.clone(),false);mixin.range.endLine=lineNumber;mixin.range.endColumn=newColumn;mixins.push(mixin);state=States.Initial;}else{mixinValue.text+=tokenValue;}
break;case States.Media:if(tokenValue==="{"&&tokenType===UndefTokenType)
state=States.Initial;break;default:console.assert(false,"Unknown SASS parser state.");}}
var tokenizer=tokenizerFactory.createTokenizer("text/x-scss");var lineNumber;for(lineNumber=0;lineNumber<lines.length;++lineNumber){var line=lines[lineNumber];tokenizer(line,processToken);processToken("\n",null,line.length,line.length+1);}
return{variables:variables,properties:properties,mixins:mixins};}
WebInspector.SASSSupport.ASTDocument=function(url,text)
{this.url=url;this.text=text;this.edits=[];}
WebInspector.SASSSupport.ASTDocument.prototype={clone:function()
{return new WebInspector.SASSSupport.ASTDocument(this.url,this.text);},hasChanged:function()
{return!!this.edits.length;},newText:function()
{this.edits.stableSort(sequentialOrder);var text=this.text;for(var i=this.edits.length-1;i>=0;--i)
text=this.edits[i].applyToText(text);return text;function sequentialOrder(edit1,edit2)
{var range1=edit1.oldRange.collapseToStart();var range2=edit2.oldRange.collapseToStart();if(range1.equal(range2))
return 0;return range1.follows(range2)?1:-1;}},}
WebInspector.SASSSupport.Node=function(document)
{this.document=document;}
WebInspector.SASSSupport.TextNode=function(document,text,range)
{WebInspector.SASSSupport.Node.call(this,document);this.text=text;this.range=range;}
WebInspector.SASSSupport.TextNode.prototype={setText:function(newText)
{if(this.text===newText)
return;this.text=newText;this.document.edits.push(new WebInspector.SourceEdit(this.document.url,this.range,newText));},clone:function(document)
{return new WebInspector.SASSSupport.TextNode(document,this.text,this.range.clone());},match:function(other,outNodeMapping)
{if(this.text.trim()!==other.text.trim())
return false;if(outNodeMapping)
outNodeMapping.set(this,other);return true;},__proto__:WebInspector.SASSSupport.Node.prototype}
WebInspector.SASSSupport.Property=function(document,name,value,range,disabled)
{WebInspector.SASSSupport.Node.call(this,document);this.name=name;this.value=value;this.range=range;this.name.parent=this;this.value.parent=this;this.disabled=disabled;}
WebInspector.SASSSupport.Property.prototype={clone:function(document)
{return new WebInspector.SASSSupport.Property(document,this.name.clone(document),this.value.clone(document),this.range.clone(),this.disabled);},visit:function(callback)
{callback(this);callback(this.name);callback(this.value);},match:function(other,outNodeMapping)
{if(this.disabled!==other.disabled)
return false;if(outNodeMapping)
outNodeMapping.set(this,other);return this.name.match(other.name,outNodeMapping)&&this.value.match(other.value,outNodeMapping);},setDisabled:function(disabled)
{if(this.disabled===disabled)
return;this.disabled=disabled;if(disabled){var oldRange1=WebInspector.TextRange.createFromLocation(this.range.startLine,this.range.startColumn);var edit1=new WebInspector.SourceEdit(this.document.url,oldRange1,"/* ");var oldRange2=WebInspector.TextRange.createFromLocation(this.range.endLine,this.range.endColumn);var edit2=new WebInspector.SourceEdit(this.document.url,oldRange2," */");this.document.edits.push(edit1,edit2);return;}
var oldRange1=new WebInspector.TextRange(this.range.startLine,this.range.startColumn,this.range.startLine,this.name.range.startColumn);var text=this.document.text;var edit1=new WebInspector.SourceEdit(this.document.url,oldRange1,"");var oldRange2=new WebInspector.TextRange(this.range.endLine,this.range.endColumn-2,this.range.endLine,this.range.endColumn);var edit2=new WebInspector.SourceEdit(this.document.url,oldRange2,"");this.document.edits.push(edit1,edit2);},remove:function()
{console.assert(this.parent);var rule=this.parent;var index=rule.properties.indexOf(this);rule.properties.splice(index,1);this.parent=null;var lineRange=new WebInspector.TextRange(this.range.startLine,0,this.range.endLine+1,0);var oldRange;if(lineRange.extract(this.document.text).trim()===this.range.extract(this.document.text).trim())
oldRange=lineRange;else
oldRange=this.range;this.document.edits.push(new WebInspector.SourceEdit(this.document.url,oldRange,""));},__proto__:WebInspector.SASSSupport.Node.prototype}
WebInspector.SASSSupport.Rule=function(document,selector,styleRange,properties)
{WebInspector.SASSSupport.Node.call(this,document);this.selector=selector;this.properties=properties;this.styleRange=styleRange;for(var i=0;i<this.properties.length;++i)
this.properties[i].parent=this;this._hasTrailingSemicolon=!this.properties.length||this.properties.peekLast().range.extract(this.document.text).endsWith(";");}
WebInspector.SASSSupport.Rule.prototype={clone:function(document)
{var properties=[];for(var i=0;i<this.properties.length;++i)
properties.push(this.properties[i].clone(document));return new WebInspector.SASSSupport.Rule(document,this.selector,this.styleRange.clone(),properties);},visit:function(callback)
{callback(this);for(var i=0;i<this.properties.length;++i)
this.properties[i].visit(callback);},match:function(other,outNodeMapping)
{if(this.selector!==other.selector)
return false;if(this.properties.length!==other.properties.length)
return false;if(outNodeMapping)
outNodeMapping.set(this,other);var result=true;for(var i=0;result&&i<this.properties.length;++i)
result=result&&this.properties[i].match(other.properties[i],outNodeMapping);return result;},_addTrailingSemicolon:function()
{if(this._hasTrailingSemicolon||!this.properties)
return;this._hasTrailingSemicolon=true;this.document.edits.push(new WebInspector.SourceEdit(this.document.url,this.properties.peekLast().range.collapseToEnd(),";"))},insertProperties:function(nameTexts,valueTexts,disabledStates,anchorProperty,insertBefore)
{console.assert(this.properties.length,"Cannot insert in empty rule.");console.assert(nameTexts.length===valueTexts.length&&valueTexts.length===disabledStates.length,"Input array should be of the same size.");this._addTrailingSemicolon();var newProperties=[];var index=this.properties.indexOf(anchorProperty);for(var i=0;i<nameTexts.length;++i){var nameText=nameTexts[i];var valueText=valueTexts[i];var disabled=disabledStates[i];this.document.edits.push(this._insertPropertyEdit(nameText,valueText,disabled,anchorProperty,insertBefore));var name=new WebInspector.SASSSupport.TextNode(this.document,nameText,WebInspector.TextRange.createFromLocation(0,0));var value=new WebInspector.SASSSupport.TextNode(this.document,valueText,WebInspector.TextRange.createFromLocation(0,0));var newProperty=new WebInspector.SASSSupport.Property(this.document,name,value,WebInspector.TextRange.createFromLocation(0,0),disabled);this.properties.splice(insertBefore?index+i:index+i+1,0,newProperty);newProperty.parent=this;newProperties.push(newProperty);}
return newProperties;},_insertPropertyEdit:function(nameText,valueText,disabled,anchorProperty,insertBefore)
{var oldRange=insertBefore?anchorProperty.range.collapseToStart():anchorProperty.range.collapseToEnd();var indent=(new WebInspector.TextRange(anchorProperty.range.startLine,0,anchorProperty.range.startLine,anchorProperty.range.startColumn)).extract(this.document.text);if(!/^\s+$/.test(indent))indent="";var newText="";var leftComment=disabled?"/* ":"";var rightComment=disabled?" */":"";if(insertBefore){newText=String.sprintf("%s%s: %s;%s\n%s",leftComment,nameText,valueText,rightComment,indent);}else{newText=String.sprintf("\n%s%s%s: %s;%s",indent,leftComment,nameText,valueText,rightComment);}
return new WebInspector.SourceEdit(this.document.url,oldRange,newText);},__proto__:WebInspector.SASSSupport.Node.prototype}
WebInspector.SASSSupport.AST=function(document,rules)
{WebInspector.SASSSupport.Node.call(this,document);this.rules=rules;for(var i=0;i<rules.length;++i)
rules[i].parent=this;}
WebInspector.SASSSupport.AST.prototype={clone:function()
{var document=this.document.clone();var rules=[];for(var i=0;i<this.rules.length;++i)
rules.push(this.rules[i].clone(document));return new WebInspector.SASSSupport.AST(document,rules);},match:function(other,outNodeMapping)
{if(other.document.url!==this.document.url)
return false;if(other.rules.length!==this.rules.length)
return false;if(outNodeMapping)
outNodeMapping.set(this,other);var result=true;for(var i=0;result&&i<this.rules.length;++i)
result=result&&this.rules[i].match(other.rules[i],outNodeMapping);return result;},visit:function(callback)
{callback(this);for(var i=0;i<this.rules.length;++i)
this.rules[i].visit(callback);},findNodeForPosition:function(lineNumber,columnNumber)
{var result=null;this.visit(onNode);return result;function onNode(node)
{if(!(node instanceof WebInspector.SASSSupport.TextNode))
return;if(node.range.containsLocation(lineNumber,columnNumber))
result=node;}},__proto__:WebInspector.SASSSupport.Node.prototype}
WebInspector.SASSSupport.PropertyChangeType={PropertyAdded:"PropertyAdded",PropertyRemoved:"PropertyRemoved",PropertyToggled:"PropertyToggled",ValueChanged:"ValueChanged",NameChanged:"NameChanged"}
WebInspector.SASSSupport.PropertyChange=function(type,oldRule,newRule,oldPropertyIndex,newPropertyIndex)
{this.type=type;this.oldRule=oldRule;this.newRule=newRule;this.oldPropertyIndex=oldPropertyIndex;this.newPropertyIndex=newPropertyIndex;}
WebInspector.SASSSupport.PropertyChange.prototype={oldProperty:function()
{return this.oldRule.properties[this.oldPropertyIndex]||null;},newProperty:function()
{return this.newRule.properties[this.newPropertyIndex]||null;}}
WebInspector.SASSSupport.ASTDiff=function(url,oldAST,newAST,mapping,changes)
{this.url=url;this.mapping=mapping;this.changes=changes;this.oldAST=oldAST;this.newAST=newAST;}
WebInspector.SASSSupport.diffModels=function(oldAST,newAST)
{console.assert(oldAST.rules.length===newAST.rules.length,"Not implemented for rule diff.");console.assert(oldAST.document.url===newAST.document.url,"Diff makes sense for models with the same url.");var T=WebInspector.SASSSupport.PropertyChangeType;var changes=[];var mapping=new Map();for(var i=0;i<oldAST.rules.length;++i){var oldRule=oldAST.rules[i];var newRule=newAST.rules[i];computeRuleDiff(mapping,oldRule,newRule);}
return new WebInspector.SASSSupport.ASTDiff(oldAST.document.url,oldAST,newAST,mapping,changes);function addChange(type,oldRule,newRule,oldPropertyIndex,newPropertyIndex)
{changes.push(new WebInspector.SASSSupport.PropertyChange(type,oldRule,newRule,oldPropertyIndex,newPropertyIndex));}
function computeRuleDiff(mapping,oldRule,newRule)
{var oldLines=[];for(var i=0;i<oldRule.properties.length;++i)
oldLines.push(oldRule.properties[i].name.text.trim()+":"+oldRule.properties[i].value.text.trim());var newLines=[];for(var i=0;i<newRule.properties.length;++i)
newLines.push(newRule.properties[i].name.text.trim()+":"+newRule.properties[i].value.text.trim());var diff=WebInspector.Diff.lineDiff(oldLines,newLines);diff=WebInspector.Diff.convertToEditDiff(diff);var p1=0,p2=0;for(var i=0;i<diff.length;++i){var token=diff[i];if(token[0]===WebInspector.Diff.Operation.Delete){for(var j=0;j<token[1];++j)
addChange(T.PropertyRemoved,oldRule,newRule,p1++,p2);}else if(token[0]===WebInspector.Diff.Operation.Insert){for(var j=0;j<token[1];++j)
addChange(T.PropertyAdded,oldRule,newRule,p1,p2++);}else{for(var j=0;j<token[1];++j)
computePropertyDiff(mapping,oldRule,newRule,p1++,p2++);}}}
function computePropertyDiff(mapping,oldRule,newRule,oldPropertyIndex,newPropertyIndex)
{var oldProperty=oldRule.properties[oldPropertyIndex];var newProperty=newRule.properties[newPropertyIndex];mapping.set(oldProperty.name,newProperty.name);mapping.set(oldProperty.value,newProperty.value);if(oldProperty.name.text.trim()!==newProperty.name.text.trim())
addChange(T.NameChanged,oldRule,newRule,oldPropertyIndex,newPropertyIndex);if(oldProperty.value.text.trim()!==newProperty.value.text.trim())
addChange(T.ValueChanged,oldRule,newRule,oldPropertyIndex,newPropertyIndex);if(oldProperty.disabled!==newProperty.disabled)
addChange(T.PropertyToggled,oldRule,newRule,oldPropertyIndex,newPropertyIndex);}};WebInspector.ASTService=function()
{this._cssParserService=new WebInspector.CSSParserService();this._sassInitPromise=self.runtime.instancePromise(WebInspector.TokenizerFactory);this._terminated=false;}
WebInspector.ASTService.prototype={parseCSS:function(url,text)
{console.assert(!this._terminated,"Illegal call parseCSS on terminated ASTService.");return WebInspector.SASSSupport.parseCSS(this._cssParserService,url,text);},parseSCSS:function(url,text)
{console.assert(!this._terminated,"Illegal call parseSCSS on terminated ASTService.");return this._sassInitPromise.then(tokenizer=>WebInspector.SASSSupport.parseSCSS(tokenizer,url,text));},dispose:function()
{if(this._terminated)
return;this._terminated=true;this._cssParserService.dispose();},};WebInspector.SASSProcessor=function(astService,map,editOperations)
{this._astService=astService;this._map=map;this._editOperations=editOperations;}
WebInspector.SASSProcessor.prototype={_mutate:function()
{var changedCSSRules=new Set();for(var editOperation of this._editOperations){var rules=editOperation.perform();changedCSSRules.addAll(rules);}
var promises=[];for(var ast of this._map.models().values()){if(!ast.document.hasChanged())
continue;var promise;if(ast.document.url===this._map.cssURL())
promise=this._astService.parseCSS(ast.document.url,ast.document.newText());else
promise=this._astService.parseSCSS(ast.document.url,ast.document.newText());promises.push(promise);}
return Promise.all(promises).then(this._onFinished.bind(this,changedCSSRules));},_onFinished:function(changedCSSRules,changedModels)
{var nodeMapping=new Map();var map=this._map.rebase(changedModels,nodeMapping);if(!map)
return null;var cssEdits=[];for(var rule of changedCSSRules){var oldRange=rule.styleRange;var newRule=nodeMapping.get(rule);var newText=newRule.styleRange.extract(newRule.document.text);cssEdits.push(new WebInspector.SourceEdit(newRule.document.url,oldRange,newText));}
var newSASSSources=new Map();for(var model of changedModels){if(model.document.url===map.cssURL())
continue;newSASSSources.set(model.document.url,model.document.text);}
return new WebInspector.SASSProcessor.Result(map,cssEdits,newSASSSources);}}
WebInspector.SASSProcessor.Result=function(map,cssEdits,newSASSSources)
{this.map=map;this.cssEdits=cssEdits;this.newSASSSources=newSASSSources;}
WebInspector.SASSProcessor.processCSSEdits=function(astService,map,ranges,newTexts)
{console.assert(ranges.length===newTexts.length);var cssURL=map.cssURL();var cssText=map.cssAST().document.text;for(var i=0;i<ranges.length;++i){var range=ranges[i];var edit=new WebInspector.SourceEdit(cssURL,range,newTexts[i]);cssText=edit.applyToText(cssText);}
return astService.parseCSS(cssURL,cssText).then(onCSSParsed);function onCSSParsed(newCSSAST)
{var cssDiff=WebInspector.SASSSupport.diffModels(map.cssAST(),newCSSAST);var edits=WebInspector.SASSProcessor._editsFromCSSDiff(cssDiff,map);var changedURLs=new Set(edits.map(edit=>edit.sassURL));changedURLs.add(map.cssURL());var clonedModels=[];for(var url of changedURLs)
clonedModels.push(map.modelForURL(url).clone());var nodeMapping=new Map();var rebasedMap=(map.rebase(clonedModels,nodeMapping));console.assert(rebasedMap);var rebasedEdits=edits.map(edit=>edit.rebase(rebasedMap,nodeMapping));return new WebInspector.SASSProcessor(astService,rebasedMap,rebasedEdits)._mutate();}}
WebInspector.SASSProcessor._editsFromCSSDiff=function(cssDiff,map)
{var T=WebInspector.SASSSupport.PropertyChangeType;var operations=[];for(var i=0;i<cssDiff.changes.length;++i){var change=cssDiff.changes[i];var operation=null;if(change.type===T.ValueChanged||change.type===T.NameChanged)
operation=WebInspector.SASSProcessor.SetTextOperation.fromCSSChange(change,map);else if(change.type===T.PropertyToggled)
operation=WebInspector.SASSProcessor.TogglePropertyOperation.fromCSSChange(change,map);else if(change.type===T.PropertyRemoved)
operation=WebInspector.SASSProcessor.RemovePropertyOperation.fromCSSChange(change,map);else if(change.type===T.PropertyAdded)
operation=WebInspector.SASSProcessor.InsertPropertiesOperation.fromCSSChange(change,map);if(!operation){WebInspector.console.error("Operation ignored: "+change.type);continue;}
var merged=false;for(var j=0;!merged&&j<operations.length;++j)
merged=operations[j].merge(operation);if(!merged)
operations.push(operation);}
return operations;}
WebInspector.SASSProcessor.EditOperation=function(map,sassURL)
{this.map=map;this.sassURL=sassURL;}
WebInspector.SASSProcessor.EditOperation.prototype={merge:function(other)
{return false;},perform:function()
{return[];},rebase:function(newMap,nodeMapping)
{return this;},}
WebInspector.SASSProcessor.SetTextOperation=function(map,sassNode,newText)
{WebInspector.SASSProcessor.EditOperation.call(this,map,sassNode.document.url);this._sassNode=sassNode;this._newText=newText;}
WebInspector.SASSProcessor.SetTextOperation.fromCSSChange=function(change,map)
{var oldProperty=(change.oldProperty());var newProperty=(change.newProperty());console.assert(oldProperty&&newProperty,"SetTextOperation must have both oldProperty and newProperty");var newValue=null;var sassNode=null;if(change.type===WebInspector.SASSSupport.PropertyChangeType.NameChanged){newValue=newProperty.name.text;sassNode=map.toSASSNode(oldProperty.name);}else{newValue=newProperty.value.text;sassNode=map.toSASSNode(oldProperty.value);}
if(!sassNode)
return null;return new WebInspector.SASSProcessor.SetTextOperation(map,sassNode,newValue);}
WebInspector.SASSProcessor.SetTextOperation.prototype={merge:function(other)
{if(!(other instanceof WebInspector.SASSProcessor.SetTextOperation))
return false;return this._sassNode===other._sassNode;},perform:function()
{this._sassNode.setText(this._newText);var nodes=this.map.toCSSNodes(this._sassNode);for(var node of nodes)
node.setText(this._newText);var cssRules=nodes.map(textNode=>textNode.parent.parent);return cssRules;},rebase:function(newMap,nodeMapping)
{var sassNode=(nodeMapping.get(this._sassNode))||this._sassNode;return new WebInspector.SASSProcessor.SetTextOperation(newMap,sassNode,this._newText);},__proto__:WebInspector.SASSProcessor.EditOperation.prototype}
WebInspector.SASSProcessor.TogglePropertyOperation=function(map,sassProperty,newDisabled)
{WebInspector.SASSProcessor.EditOperation.call(this,map,sassProperty.document.url);this._sassProperty=sassProperty;this._newDisabled=newDisabled;}
WebInspector.SASSProcessor.TogglePropertyOperation.fromCSSChange=function(change,map)
{var oldCSSProperty=(change.oldProperty());console.assert(oldCSSProperty,"TogglePropertyOperation must have old CSS property");var sassProperty=map.toSASSProperty(oldCSSProperty);if(!sassProperty)
return null;var newDisabled=change.newProperty().disabled;return new WebInspector.SASSProcessor.TogglePropertyOperation(map,sassProperty,newDisabled);}
WebInspector.SASSProcessor.TogglePropertyOperation.prototype={merge:function(other)
{if(!(other instanceof WebInspector.SASSProcessor.TogglePropertyOperation))
return false;return this._sassProperty===other._sassProperty;},perform:function()
{this._sassProperty.setDisabled(this._newDisabled);var cssProperties=this.map.toCSSProperties(this._sassProperty);for(var property of cssProperties)
property.setDisabled(this._newDisabled);var cssRules=cssProperties.map(property=>property.parent);return cssRules;},rebase:function(newMap,nodeMapping)
{var sassProperty=(nodeMapping.get(this._sassProperty))||this._sassProperty;return new WebInspector.SASSProcessor.TogglePropertyOperation(newMap,sassProperty,this._newDisabled);},__proto__:WebInspector.SASSProcessor.EditOperation.prototype}
WebInspector.SASSProcessor.RemovePropertyOperation=function(map,sassProperty)
{WebInspector.SASSProcessor.EditOperation.call(this,map,sassProperty.document.url);this._sassProperty=sassProperty;}
WebInspector.SASSProcessor.RemovePropertyOperation.fromCSSChange=function(change,map)
{var removedProperty=(change.oldProperty());console.assert(removedProperty,"RemovePropertyOperation must have removed CSS property");var sassProperty=map.toSASSProperty(removedProperty);if(!sassProperty)
return null;return new WebInspector.SASSProcessor.RemovePropertyOperation(map,sassProperty);}
WebInspector.SASSProcessor.RemovePropertyOperation.prototype={merge:function(other)
{if(!(other instanceof WebInspector.SASSProcessor.RemovePropertyOperation))
return false;return this._sassProperty===other._sassProperty;},perform:function()
{var cssProperties=this.map.toCSSProperties(this._sassProperty);var cssRules=cssProperties.map(property=>property.parent);this._sassProperty.remove();for(var cssProperty of cssProperties){cssProperty.remove();this.map.unmapCssFromSass(cssProperty.name,this._sassProperty.name);this.map.unmapCssFromSass(cssProperty.value,this._sassProperty.value);}
return cssRules;},rebase:function(newMap,nodeMapping)
{var sassProperty=(nodeMapping.get(this._sassProperty))||this._sassProperty;return new WebInspector.SASSProcessor.RemovePropertyOperation(newMap,sassProperty);},__proto__:WebInspector.SASSProcessor.EditOperation.prototype}
WebInspector.SASSProcessor.InsertPropertiesOperation=function(map,sassAnchor,insertBefore,propertyNames,propertyValues,disabledStates)
{console.assert(propertyNames.length===propertyValues.length&&propertyValues.length===disabledStates.length);WebInspector.SASSProcessor.EditOperation.call(this,map,sassAnchor.document.url);this._sassAnchor=sassAnchor;this._insertBefore=insertBefore;this._nameTexts=propertyNames;this._valueTexts=propertyValues;this._disabledStates=disabledStates;}
WebInspector.SASSProcessor.InsertPropertiesOperation.fromCSSChange=function(change,map)
{var insertBefore=false;var cssAnchor=null;var sassAnchor=null;if(change.oldPropertyIndex){cssAnchor=change.oldRule.properties[change.oldPropertyIndex-1].name;sassAnchor=map.toSASSNode(cssAnchor);}else{insertBefore=true;cssAnchor=change.oldRule.properties[0].name;sassAnchor=map.toSASSNode(cssAnchor);}
if(!sassAnchor)
return null;var insertedProperty=(change.newProperty());console.assert(insertedProperty,"InsertPropertiesOperation must have inserted CSS property");var names=[insertedProperty.name.text];var values=[insertedProperty.value.text];var disabledStates=[insertedProperty.disabled];return new WebInspector.SASSProcessor.InsertPropertiesOperation(map,sassAnchor.parent,insertBefore,names,values,disabledStates);}
WebInspector.SASSProcessor.InsertPropertiesOperation.prototype={merge:function(other)
{if(!(other instanceof WebInspector.SASSProcessor.InsertPropertiesOperation))
return false;if(this._sassAnchor!==other._sassAnchor||this._insertBefore!==other._insertBefore)
return false;var names=new Set(this._nameTexts);for(var i=0;i<other._nameTexts.length;++i){var nameText=other._nameTexts[i];if(names.has(nameText))
continue;this._nameTexts.push(nameText);this._valueTexts.push(other._valueTexts[i]);this._disabledStates.push(other._disabledStates[i]);}
return true;},perform:function()
{var cssRules=[];var sassRule=this._sassAnchor.parent;var newSASSProperties=sassRule.insertProperties(this._nameTexts,this._valueTexts,this._disabledStates,this._sassAnchor,this._insertBefore);var cssAnchors=this.map.toCSSProperties(this._sassAnchor);for(var cssAnchor of cssAnchors){var cssRule=cssAnchor.parent;cssRules.push(cssRule);var newCSSProperties=cssRule.insertProperties(this._nameTexts,this._valueTexts,this._disabledStates,cssAnchor,this._insertBefore);for(var i=0;i<newCSSProperties.length;++i){this.map.mapCssToSass(newCSSProperties[i].name,newSASSProperties[i].name);this.map.mapCssToSass(newCSSProperties[i].value,newSASSProperties[i].value);}}
return cssRules;},rebase:function(newMap,nodeMapping)
{var sassAnchor=(nodeMapping.get(this._sassAnchor))||this._sassAnchor;return new WebInspector.SASSProcessor.InsertPropertiesOperation(newMap,sassAnchor,this._insertBefore,this._nameTexts,this._valueTexts,this._disabledStates);},__proto__:WebInspector.SASSProcessor.EditOperation.prototype};WebInspector.ASTSourceMap=function(cssURL,models)
{this._cssURL=cssURL;this._models=models;this._cssToSass=new Map();this._sassToCss=new Multimap();}
WebInspector.ASTSourceMap.fromSourceMap=function(astService,cssModel,sourceMap)
{var headerIds=cssModel.styleSheetIdsForURL(sourceMap.compiledURL());if(!headerIds||!headerIds.length)
return Promise.resolve((null));var header=cssModel.styleSheetHeaderForId(headerIds[0]);var models=new Map();var promises=[];for(var url of sourceMap.sources()){var contentProvider=sourceMap.sourceContentProvider(url,WebInspector.resourceTypes.SourceMapStyleSheet);var sassPromise=contentProvider.requestContent().then(onSCSSText.bind(null,url)).then(ast=>models.set(ast.document.url,ast));promises.push(sassPromise);}
var cssURL=sourceMap.compiledURL();var cssPromise=header.requestContent().then(text=>astService.parseCSS(cssURL,text||"")).then(ast=>models.set(ast.document.url,ast));promises.push(cssPromise);return Promise.all(promises).then(()=>onParsed(cssURL,models,sourceMap)).catchException((null));function onSCSSText(url,text)
{return astService.parseSCSS(url,text||"");}
function onParsed(cssURL,models,sourceMap)
{var map=new WebInspector.ASTSourceMap(cssURL,models);map.cssAST().visit(onNode);return map;function onNode(cssNode)
{if(!(cssNode instanceof WebInspector.SASSSupport.TextNode))
return;var entry=sourceMap.findEntry(cssNode.range.endLine,cssNode.range.endColumn);if(!entry||!entry.sourceURL||typeof entry.sourceLineNumber==="undefined"||typeof entry.sourceColumnNumber==="undefined")
return;var sassAST=models.get(entry.sourceURL);if(!sassAST)
return;var sassNode=sassAST.findNodeForPosition(entry.sourceLineNumber,entry.sourceColumnNumber);if(sassNode)
map.mapCssToSass(cssNode,sassNode);}}}
WebInspector.ASTSourceMap.prototype={cssURL:function()
{return this._cssURL;},cssAST:function()
{return(this._models.get(this._cssURL));},sassModels:function()
{var sassModels=(new Map(this._models));sassModels.delete(this._cssURL);return sassModels;},models:function()
{return(new Map(this._models));},modelForURL:function(url)
{return this._models.get(url)||null;},mapCssToSass:function(css,sass)
{this._cssToSass.set(css,sass);this._sassToCss.set(sass,css);},unmapCssFromSass:function(css,sass)
{this._cssToSass.delete(css);this._sassToCss.remove(sass,css);},toSASSNode:function(css)
{return this._cssToSass.get(css)||null;},toCSSNodes:function(sass)
{var cssNodes=this._sassToCss.get(sass);return cssNodes?cssNodes.valuesArray():[];},toSASSProperty:function(cssProperty)
{var sassName=this._cssToSass.get(cssProperty.name);return sassName?sassName.parent:null;},toCSSProperties:function(sassProperty)
{return this.toCSSNodes(sassProperty.name).map(name=>name.parent);},rebase:function(updated,outNodeMapping)
{outNodeMapping=outNodeMapping||new Map();outNodeMapping.clear();var models=(new Map(this._models));for(var newAST of updated){var oldAST=models.get(newAST.document.url);if(!oldAST.match(newAST,outNodeMapping))
return null;models.set(newAST.document.url,newAST);}
var newMap=new WebInspector.ASTSourceMap(this._cssURL,models);var cssNodes=this._cssToSass.keysArray();for(var i=0;i<cssNodes.length;++i){var cssNode=cssNodes[i];var sassNode=(this._cssToSass.get(cssNode));var mappedCSSNode=(outNodeMapping.get(cssNode)||cssNode);var mappedSASSNode=(outNodeMapping.get(sassNode)||sassNode);newMap.mapCssToSass(mappedCSSNode,mappedSASSNode);}
return newMap;},isValid:function()
{var cssNodes=this._cssToSass.keysArray();for(var i=0;i<cssNodes.length;++i){var cssNode=cssNodes[i];if(!cssNode.parent||!(cssNode.parent instanceof WebInspector.SASSSupport.Property))
continue;if(cssNode!==cssNode.parent.name)
continue;var sassNode=this._cssToSass.get(cssNode);if(sassNode&&cssNode.text.trim()!==sassNode.text.trim())
return false;}
return true;}};