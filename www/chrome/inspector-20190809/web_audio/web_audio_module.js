WebAudio.WebAudioModel=class extends SDK.SDKModel{constructor(target){super(target);this._enabled=false;this._contextMapById=new Map();this._agent=target.webAudioAgent();target.registerWebAudioDispatcher(this);SDK.targetManager.addModelListener(SDK.ResourceTreeModel,SDK.ResourceTreeModel.Events.FrameNavigated,this._flushContexts,this);}
_flushContexts(){this._contextMapById.clear();this.dispatchEventToListeners(WebAudio.WebAudioModel.Events.ModelReset);}
suspendModel(){this._contextMapById.clear();return this._agent.disable();}
resumeModel(){if(!this._enabled)
return Promise.resolve();return this._agent.enable();}
ensureEnabled(){if(this._enabled)
return;this._agent.enable();this._enabled=true;}
contextCreated(context){this._contextMapById.set(context.contextId,context);this.dispatchEventToListeners(WebAudio.WebAudioModel.Events.ContextCreated,context);}
contextWillBeDestroyed(contextId){this._contextMapById.delete(contextId);this.dispatchEventToListeners(WebAudio.WebAudioModel.Events.ContextDestroyed,contextId);}
contextChanged(context){if(!this._contextMapById.has(context.contextId))
return;this._contextMapById.set(context.contextId,context);this.dispatchEventToListeners(WebAudio.WebAudioModel.Events.ContextChanged,context);}
audioListenerCreated(listener){}
audioListenerWillBeDestroyed(contextId,listenerId){}
audioNodeCreated(node){}
audioNodeWillBeDestroyed(contextId,nodeId){}
audioParamCreated(param){}
audioParamWillBeDestroyed(contextId,nodeId,paramId){}
nodesConnected(contextId,sourceId,destinationId,sourceOutputIndex,destinationInputIndex){}
nodesDisconnected(contextId,sourceId,destinationId,sourceOutputIndex,destinationInputIndex){}
nodeParamConnected(contextId,sourceId,destinationId,sourceOutputIndex){}
nodeParamDisconnected(contextId,sourceId,destinationId,sourceOutputIndex){}
async requestRealtimeData(contextId){if(!this._contextMapById.has(contextId))
return Promise.resolve();return await this._agent.getRealtimeData(contextId);}};SDK.SDKModel.register(WebAudio.WebAudioModel,SDK.Target.Capability.DOM,false);WebAudio.WebAudioModel.Events={ContextCreated:Symbol('ContextCreated'),ContextDestroyed:Symbol('ContextDestroyed'),ContextChanged:Symbol('ContextChanged'),ModelReset:Symbol('ModelReset'),};;WebAudio.AudioContextSelector=class extends Common.Object{constructor(title){super();this._items=new UI.ListModel();this._dropDown=new UI.SoftDropDown(this._items,this);this._dropDown.setPlaceholderText(ls`(no recordings)`);this._toolbarItem=new UI.ToolbarItem(this._dropDown.element);this._toolbarItem.setEnabled(false);this._toolbarItem.setTitle(title);this._items.addEventListener(UI.ListModel.Events.ItemsReplaced,this._onListItemReplaced,this);this._toolbarItem.element.classList.add('toolbar-has-dropdown');this._selectedContext=null;}
_onListItemReplaced(){this._toolbarItem.setEnabled(!!this._items.length);}
contextCreated(event){const context=(event.data);this._items.insert(this._items.length,context);if(this._items.length===1)
this._dropDown.selectItem(context);}
contextDestroyed(event){const contextId=(event.data);const contextIndex=this._items.findIndex(context=>context.contextId===contextId);if(contextIndex>-1)
this._items.remove(contextIndex);}
contextChanged(event){const changedContext=(event.data);const contextIndex=this._items.findIndex(context=>context.contextId===changedContext.contextId);if(contextIndex>-1){this._items.remove(contextIndex);this._items.insert(contextIndex,changedContext);if(this._selectedContext&&this._selectedContext.contextId===changedContext.contextId)
this._dropDown.selectItem(changedContext);}}
createElementForItem(item){const element=createElementWithClass('div');const shadowRoot=UI.createShadowRootWithCoreStyles(element,'web_audio/audioContextSelector.css');const title=shadowRoot.createChild('div','title');title.createTextChild(this.titleFor(item).trimEnd(100));return element;}
selectedContext(){if(!this._selectedContext)
return null;return this._selectedContext;}
highlightedItemChanged(from,to,fromElement,toElement){if(fromElement)
fromElement.classList.remove('highlighted');if(toElement)
toElement.classList.add('highlighted');}
isItemSelectable(item){return true;}
itemSelected(item){if(!item)
return;if(!this._selectedContext||this._selectedContext.contextId!==item.contextId)
this._selectedContext=item;this.dispatchEventToListeners(WebAudio.AudioContextSelector.Events.ContextSelected,item);}
reset(){this._items.replaceAll([]);}
titleFor(context){return`${context.contextType} (${context.contextId.substr(-6)})`;}
toolbarItem(){return this._toolbarItem;}};WebAudio.AudioContextSelector.Events={ContextSelected:Symbol('ContextSelected')};;WebAudio.ContextDetailBuilder=class{constructor(context){this._fragment=createDocumentFragment();this._container=createElementWithClass('div','context-detail-container');this._fragment.appendChild(this._container);this._build(context);}
_build(context){const title=context.contextType==='realtime'?ls`AudioContext`:ls`OfflineAudioContext`;this._addTitle(title,context.contextId);this._addEntry(ls`State`,context.contextState);this._addEntry(ls`Sample Rate`,context.sampleRate,'Hz');if(context.contextType==='realtime')
this._addEntry(ls`Callback Buffer Size`,context.callbackBufferSize,'frames');this._addEntry(ls`Max Output Channels`,context.maxOutputChannelCount,'ch');}
_addTitle(title,subtitle){this._container.appendChild(UI.html`
      <div class="context-detail-header">
        <div class="context-detail-title">${title}</div>
        <div class="context-detail-subtitle">${subtitle}</div>
      </div>
    `);}
_addEntry(entry,value,unit){const valueWithUnit=value+(unit?` ${unit}`:'');this._container.appendChild(UI.html`
      <div class="context-detail-row">
        <div class="context-detail-row-entry">${entry}</div>
        <div class="context-detail-row-value">${valueWithUnit}</div>
      </div>
    `);}
getFragment(){return this._fragment;}};WebAudio.AudioContextSummaryBuilder=class{constructor(contextId,contextRealtimeData){const time=contextRealtimeData.currentTime.toFixed(3);const mean=(contextRealtimeData.callbackIntervalMean*1000).toFixed(3);const stddev=(Math.sqrt(contextRealtimeData.callbackIntervalVariance)*1000).toFixed(3);const capacity=(contextRealtimeData.renderCapacity*100).toFixed(3);this._fragment=createDocumentFragment();this._fragment.appendChild(UI.html`
      <div class="context-summary-container">
        <span>${ls`Current Time`}: ${time} s</span>
        <span>\u2758</span>
        <span>${ls`Callback Interval`}: μ = ${mean} ms, σ = ${stddev} ms</span>
        <span>\u2758</span>
        <span>${ls`Render Capacity`}: ${capacity} %</span>
      </div>
    `);}
getFragment(){return this._fragment;}};;WebAudio.WebAudioView=class extends UI.ThrottledWidget{constructor(){super(true,1000);this.element.classList.add('web-audio-drawer');this.registerRequiredCSS('web_audio/webAudio.css');const toolbarContainer=this.contentElement.createChild('div','web-audio-toolbar-container vbox');this._contextSelector=new WebAudio.AudioContextSelector(ls`BaseAudioContexts`);const toolbar=new UI.Toolbar('web-audio-toolbar',toolbarContainer);toolbar.appendToolbarItem(UI.Toolbar.createActionButtonForId('components.collect-garbage'));toolbar.appendSeparator();toolbar.appendToolbarItem(this._contextSelector.toolbarItem());this._detailViewContainer=this.contentElement.createChild('div','vbox flex-auto');this._landingPage=new UI.VBox();this._landingPage.contentElement.classList.add('web-audio-landing-page','fill');this._landingPage.contentElement.appendChild(UI.html`
      <div>
        <p>${ls`Open a page that uses Web Audio API to start monitoring.`}</p>
      </div>
    `);this._landingPage.show(this._detailViewContainer);this._summaryBarContainer=this.contentElement.createChild('div','web-audio-summary-container');this._contextSelector.addEventListener(WebAudio.AudioContextSelector.Events.ContextSelected,event=>{const context=(event.data);this._updateDetailView(context);this.doUpdate();});SDK.targetManager.observeModels(WebAudio.WebAudioModel,this);}
wasShown(){super.wasShown();for(const model of SDK.targetManager.models(WebAudio.WebAudioModel))
this._addEventListeners(model);}
willHide(){for(const model of SDK.targetManager.models(WebAudio.WebAudioModel))
this._removeEventListeners(model);}
modelAdded(webAudioModel){if(this.isShowing())
this._addEventListeners(webAudioModel);}
modelRemoved(webAudioModel){this._removeEventListeners(webAudioModel);}
async doUpdate(){await this._pollRealtimeData();this.update();}
_addEventListeners(webAudioModel){webAudioModel.ensureEnabled();webAudioModel.addEventListener(WebAudio.WebAudioModel.Events.ContextCreated,this._contextCreated,this);webAudioModel.addEventListener(WebAudio.WebAudioModel.Events.ContextDestroyed,this._contextDestroyed,this);webAudioModel.addEventListener(WebAudio.WebAudioModel.Events.ContextChanged,this._contextChanged,this);webAudioModel.addEventListener(WebAudio.WebAudioModel.Events.ModelReset,this._reset,this);}
_removeEventListeners(webAudioModel){webAudioModel.removeEventListener(WebAudio.WebAudioModel.Events.ContextCreated,this._contextCreated,this);webAudioModel.removeEventListener(WebAudio.WebAudioModel.Events.ContextDestroyed,this._contextDestroyed,this);webAudioModel.removeEventListener(WebAudio.WebAudioModel.Events.ContextChanged,this._contextChanged,this);webAudioModel.removeEventListener(WebAudio.WebAudioModel.Events.ModelReset,this._reset,this);}
_contextCreated(event){this._contextSelector.contextCreated(event);}
_contextDestroyed(event){this._contextSelector.contextDestroyed(event);}
_contextChanged(event){this._contextSelector.contextChanged(event);}
_reset(){if(this._landingPage.isShowing())
this._landingPage.detach();this._contextSelector.reset();this._detailViewContainer.removeChildren();this._landingPage.show(this._detailViewContainer);}
_updateDetailView(context){if(this._landingPage.isShowing())
this._landingPage.detach();const detailBuilder=new WebAudio.ContextDetailBuilder(context);this._detailViewContainer.removeChildren();this._detailViewContainer.appendChild(detailBuilder.getFragment());}
_updateSummaryBar(contextId,contextRealtimeData){const summaryBuilder=new WebAudio.AudioContextSummaryBuilder(contextId,contextRealtimeData);this._summaryBarContainer.removeChildren();this._summaryBarContainer.appendChild(summaryBuilder.getFragment());}
_clearSummaryBar(){this._summaryBarContainer.removeChildren();}
async _pollRealtimeData(){const context=this._contextSelector.selectedContext();if(!context){this._clearSummaryBar();return;}
for(const model of SDK.targetManager.models(WebAudio.WebAudioModel)){if(context.contextType==='realtime'){const realtimeData=await model.requestRealtimeData(context.contextId);if(realtimeData)
this._updateSummaryBar(context.contextId,realtimeData);}else{this._clearSummaryBar();}}}};;Runtime.cachedResources["web_audio/webAudio.css"]="/*\n * Copyright 2019 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n:host {\n  overflow: hidden;\n}\n\n.web-audio-toolbar-container {\n  background-color: var(--toolbar-bg-color);\n  border-bottom: var(--divider-border);\n}\n\n.web-audio-toolbar {\n  display: inline-block;\n}\n\n.web-audio-landing-page {\n  position: absolute;\n  background-color: white;\n  justify-content: center;\n  align-items: center;\n  overflow: auto;\n  font-size: 13px;\n  color: #777;\n}\n\n.web-audio-landing-page > div {\n  max-width: 500px;\n  margin: 10px;\n}\n\n.web-audio-landing-page > div > p {\n  flex: none;\n  white-space: pre-line;\n}\n\n.context-detail-container {\n  flex: none;\n  display: flex;\n  background-color: white;\n  flex-direction: column;\n}\n\n.context-detail-header {\n  border-bottom: 1px solid rgb(230, 230, 230);\n  padding: 12px 24px;\n  margin-bottom: 10px;\n}\n\n.context-detail-title {\n  font-size: 15px;\n  font-weight: 400;\n}\n\n.context-detail-subtitle {\n  font-size: 12px;\n  margin-top: 10px;\n  user-select: text;\n}\n\n.context-detail-row {\n  flex-direction: row;\n  display: flex;\n  line-height: 18px;\n  padding-left: 24px;\n}\n\n.context-detail-row-entry:not(:empty) {\n  color: hsla(0, 0%, 46%, 1);\n  overflow: hidden;\n  width: 130px;\n}\n\n.context-detail-row-value {\n  user-select: text;\n  white-space: nowrap;\n  text-overflow: ellipsis;\n  overflow: hidden;\n}\n\n.context-summary-container {\n  flex: 0 0 27px;\n  line-height: 27px;\n  padding-left: 5px;\n  background-color: #eee;\n  border-top: 1px solid #ccc;\n  white-space: nowrap;\n  text-overflow: ellipsis;\n  overflow: hidden;\n}\n\n.context-summary-container span {\n  margin-right: 6px;\n}\n\n/*# sourceURL=web_audio/webAudio.css */";Runtime.cachedResources["web_audio/audioContextSelector.css"]="/*\n * Copyright 2019 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n:host {\n  padding: 2px 1px 2px 2px;\n  white-space: nowrap;\n  display: flex;\n  flex-direction: column;\n  height: 36px;\n  justify-content: center;\n}\n\n.title {\n  overflow: hidden;\n  text-overflow: ellipsis;\n  flex-grow: 0;\n}\n/*# sourceURL=web_audio/audioContextSelector.css */";