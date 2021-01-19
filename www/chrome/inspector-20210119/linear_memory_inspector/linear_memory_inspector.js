import*as e from"../common/common.js";import{ls as t,SimpleHistoryManager as s}from"../common/common.js";import*as r from"../third_party/lit-html/lit-html.js";import{Directives as n}from"../third_party/lit-html/lit-html.js";import{assertNever as i}from"../platform/platform.js";import{GetStylesheet as o,SetCSSProperty as a}from"../component_helpers/component_helpers.js";import{SDKModel as d,RuntimeModel as l,DebuggerModel as c,RemoteObject as h}from"../sdk/sdk.js";import{Widget as p,TabbedPane as u,Context as m,ViewManager as g}from"../ui/ui.js";import{Workspace as y}from"../workspace/workspace.js";const{render:v,html:f}=r,w=t,b=w`Enter address`;class x extends Event{constructor(e,t){super("address-input-changed"),this.data={address:e,mode:t}}}class E extends Event{constructor(e){super("page-navigation",{}),this.data=e}}class _ extends Event{constructor(e){super("history-navigation",{}),this.data=e}}class I extends Event{constructor(){super("refresh-requested",{})}}class T extends HTMLElement{constructor(){super(...arguments),this.shadow=this.attachShadow({mode:"open"}),this.address="0",this.error=void 0,this.valid=!0}set data(e){this.address=e.address,this.error=e.error,this.valid=e.valid,this.render();const t=this.shadow.querySelector(".address-input");t&&("Submitted"===e.mode?t.blur():"InvalidSubmit"===e.mode&&t.select())}render(){const e=f`
      <style>
        .navigator {
          min-height: 24px;
          display: flex;
          flex-wrap: nowrap;
          justify-content: space-between;
          overflow: hidden;
          align-items: center;
          background-color: var(--color-background);
          color: var(--color-text-primary);
        }

        .navigator-item {
          display: flex;
          white-space: nowrap;
          overflow: hidden;
        }

        .address-input {
          text-align: center;
          outline: none;
          color: var(--color-text-primary);
          border: 1px solid var(--color-background-elevation-2);
          background: transparent;
        }

        .address-input.invalid {
          color: var(--color-accent-red);
        }

        .navigator-button {
          display: flex;
          width: 20px;
          height: 20px;
          background: transparent;
          overflow: hidden;
          border: none;
          padding: 0;
          outline: none;
          justify-content: center;
          align-items: center;
        }

        .navigator-button devtools-icon {
          height: 14px;
          width: 14px;
          min-height: 14px;
          min-width: 14px;
        }

        .navigator-button:hover devtools-icon {
          --icon-color: var(--color-text-primary);
        }

        .navigator-button:focus devtools-icon {
          --icon-color: var(--color-text-secondary);
        }
        </style>
      <div class="navigator">
        <div class="navigator-item">
          ${this.createButton("ic_undo_16x16_icon",w`Go back in address history`,new _("Backward"))}
          ${this.createButton("ic_redo_16x16_icon",w`Go forward in address history`,new _("Forward"))}
        </div>
        <div class="navigator-item">
          ${this.createButton("ic_page_prev_16x16_icon",w`Previous page`,new E("Backward"))}
          ${this.createAddressInput()}
          ${this.createButton("ic_page_next_16x16_icon",w`Next page`,new E("Forward"))}
        </div>
        ${this.createButton("refresh_12x12_icon",w`Refresh`,new I)}
      </div>
      `;v(e,this.shadow,{eventContext:this})}createAddressInput(){const e={"address-input":!0,invalid:!this.valid};return f`
      <input class=${n.classMap(e)} data-input="true" .value=${this.address}
        title=${this.valid?b:this.error} @change=${this.onAddressChange.bind(this,"Submitted")} @input=${this.onAddressChange.bind(this,"Edit")}/>`}onAddressChange(e,t){const s=t.target;this.dispatchEvent(new x(s.value,e))}createButton(e,t,s){return f`
      <button class="navigator-button"
        data-button=${s.type} title=${t}
        @click=${this.dispatchEvent.bind(this,s)}>
        <devtools-icon .data=${{iconName:e,color:"var(--color-text-secondary)",width:"14px"}}>
        </devtools-icon>
      </button>`}}customElements.define("devtools-linear-memory-inspector-navigator",T);var M=Object.freeze({__proto__:null,AddressInputChangedEvent:x,PageNavigationEvent:E,HistoryNavigationEvent:_,RefreshRequestedEvent:I,LinearMemoryNavigator:T});const R=t;function $(e){switch(e){case"dec":return R`dec`;case"hex":return R`hex`;case"oct":return R`oct`;case"sci":return R`sci`;case"none":return R`none`;default:return i(e,"Unknown mode: "+e)}}function S(e){switch(e){case"Little Endian":return R`Little Endian`;case"Big Endian":return R`Big Endian`;default:return i(e,"Unknown endianness: "+e)}}function O(e){switch(e){case"Integer 8-bit":return R`Integer 8-bit`;case"Integer 16-bit":return R`Integer 16-bit`;case"Integer 32-bit":return R`Integer 32-bit`;case"Integer 64-bit":return R`Integer 64-bit`;case"Float 32-bit":return R`Float 32-bit`;case"Float 64-bit":return R`Float 64-bit`;case"String":return R`String`;default:return i(e,"Unknown value type: "+e)}}function A(e,t){switch(e){case"Integer 8-bit":case"Integer 16-bit":case"Integer 32-bit":case"Integer 64-bit":return"dec"===t||"hex"===t||"oct"===t;case"Float 32-bit":case"Float 64-bit":return"sci"===t||"dec"===t;case"String":return"none"===t;default:return i(e,"Unknown value type: "+e)}}function B(e){switch(e){case"Integer 8-bit":case"Integer 16-bit":case"Integer 32-bit":case"Integer 64-bit":case"Float 32-bit":case"Float 64-bit":return!0;default:return!1}}function C(e){const t=new DataView(e.buffer),s="Little Endian"===e.endianness;let r;try{switch(e.type){case"Integer 8-bit":return r=e.signed?t.getInt8(0):t.getUint8(0),L(r,e.mode);case"Integer 16-bit":return r=e.signed?t.getInt16(0,s):t.getUint16(0,s),L(r,e.mode);case"Integer 32-bit":return r=e.signed?t.getInt32(0,s):t.getUint32(0,s),L(r,e.mode);case"Integer 64-bit":return r=e.signed?t.getBigInt64(0,s):t.getBigUint64(0,s),L(r,e.mode);case"Float 32-bit":return r=t.getFloat32(0,s),P(r,e.mode);case"Float 64-bit":return r=t.getFloat64(0,s),P(r,e.mode);case"String":throw new Error(`Type ${e.type} is not yet implemented`);default:return i(e.type,"Unknown value type: "+e.type)}}catch(e){return"N/A"}}function P(e,t){switch(t){case"dec":return e.toFixed(2).toString();case"sci":return e.toExponential(2).toString();default:throw new Error(`Unknown mode for floats: ${t}.`)}}function L(e,t){switch(t){case"dec":return e.toString();case"hex":return e.toString(16);case"oct":return e.toString(8);default:throw new Error(`Unknown mode for integers: ${t}.`)}}var k=Object.freeze({__proto__:null,VALUE_INTEPRETER_MAX_NUM_BYTES:8,valueTypeModeToLocalizedString:$,endiannessToLocalizedString:S,valueTypeToLocalizedString:O,isValidMode:A,isNumber:B,format:C,formatFloat:P,formatInteger:L}),j=t;const{render:V,html:U}=r,z=new Map([["Integer 8-bit","dec"],["Integer 16-bit","dec"],["Integer 32-bit","dec"],["Integer 64-bit","dec"],["Float 32-bit","dec"],["Float 64-bit","dec"],["String","none"]]),F=Array.from(z.keys());class N extends HTMLElement{constructor(){super(...arguments),this.shadow=this.attachShadow({mode:"open"}),this.endianness="Little Endian",this.buffer=new ArrayBuffer(0),this.valueTypes=new Set,this.valueTypeModeConfig=z}set data(e){this.buffer=e.buffer,this.endianness=e.endianness,this.valueTypes=e.valueTypes,this.valueTypeModeConfig=z,e.valueTypeModes&&e.valueTypeModes.forEach(((e,t)=>{A(t,e)&&this.valueTypeModeConfig.set(t,e)})),this.render()}render(){V(U`
      <style>
        :host {
          flex: auto;
          display: flex;
        }

        .mode-type {
          color: var(--text-highlight-color);
        }

        .value-types {
          width: 100%;
          display: grid;
          grid-template-columns: auto auto 1fr;
          grid-column-gap: 24px;
          grid-row-gap: 4px;
          overflow: hidden;
          padding-left: 12px;
          padding-right: 12px;
        }

        .value-type-cell-multiple-values {
          gap: 5px;
        }

        .value-type-cell {
          height: 21px;
          text-overflow: ellipsis;
          white-space: nowrap;
          overflow: hidden;
          display: flex;
        }

        .value-type-cell-no-mode {
          grid-column: 1 / 3;
        }

      </style>
      <div class="value-types">
        ${F.map((e=>this.valueTypes.has(e)?this.showValue(e):""))}
      </div>
    `,this.shadow,{eventContext:this})}showValue(e){const t=this.valueTypeModeConfig.get(e);if(!t)throw new Error("No mode found for type "+e);const s=O(e),r=$(t),n=this.parse({type:e,signed:!1}),i=this.parse({type:e,signed:!0}),o=i!==n;return U`
      ${B(e)?U`
          <span class="value-type-cell">${s}</span>
          <span class="mode-type value-type-cell">${r}</span>`:U`
          <span class="value-type-cell-no-mode value-type-cell">${s}</span>`}

        ${o?U`
          <div class="value-type-cell-multiple-values value-type-cell">
            <span data-value="true" title=${j`Unsigned value`}>${n}</span>
            <span>/<span>
            <span data-value="true" title=${j`Signed value`}>${i}</span>
          </div>`:U`
          <span class="value-type-cell" data-value="true">${n}</span>`}
    `}parse(e){const t=this.valueTypeModeConfig.get(e.type);return t?C({buffer:this.buffer,type:e.type,endianness:this.endianness,signed:e.signed||!1,mode:t}):(console.error("No known way of showing value for "+e.type),"N/A")}}customElements.define("devtools-linear-memory-inspector-interpreter-display",N);var D=Object.freeze({__proto__:null,ValueInterpreterDisplay:N});const{render:q,html:G}=r,H=new Map([["Integer",["Integer 8-bit","Integer 16-bit","Integer 32-bit","Integer 64-bit"]],["Floating point",["Float 32-bit","Float 64-bit"]]]);class Y extends Event{constructor(e,t){super("type-toggle"),this.data={type:e,checked:t}}}class W extends HTMLElement{constructor(){super(...arguments),this.shadow=this.attachShadow({mode:"open"}),this.valueTypes=new Set}set data(e){this.valueTypes=e.valueTypes,this.render()}render(){q(G`
      <style>
        :host {
          flex: auto;
          display: flex;
          min-height: 20px;
        }

        .settings {
          display: flex;
          flex-wrap: wrap;
          margin: 0 12px 12px 12px;
          column-gap: 45px;
          row-gap: 15px;
        }

        .value-types-selection {
          display: flex;
          flex-direction: column;
        }

        .value-types-selection + .value-types-selection {
          margin-left: 45px;
        }

        .group {
          font-weight: bold;
          margin-bottom: 11px;
        }

        .type-label {
          white-space: nowrap;
        }

        .group + .type-label {
          margin-top: 5px;
        }

        .type-label input {
          margin: 0 6px 0 0;
          padding: 0;
        }

        .type-label + .type-label {
          margin-top: 6px;
        }
      </style>
      <div class="settings">
       ${[...H.keys()].map((e=>G`
          <div class="value-types-selection">
            <span class="group">${e}</span>
            ${this.plotTypeSelections(e)}
          </div>
        `))}
      </div>
      `,this.shadow,{eventContext:this})}plotTypeSelections(e){const t=H.get(e);if(!t)throw new Error("Unknown group "+e);return G`
      ${t.map((e=>G`
          <label class="type-label" title=${O(e)}>
            <input data-input="true" type="checkbox" .checked=${this.valueTypes.has(e)} @change=${t=>this.onTypeToggle(e,t)}>
            <span data-title="true">${O(e)}</span>
          </label>
     `))}`}onTypeToggle(e,t){const s=t.target;this.dispatchEvent(new Y(e,s.checked))}}customElements.define("devtools-linear-memory-inspector-interpreter-settings",W);var Z=Object.freeze({__proto__:null,TypeToggleEvent:Y,ValueInterpreterSettings:W});const K=t,{render:X,html:J}=r,Q=o.getStyleSheets;class ee extends Event{constructor(e){super("endianness-changed"),this.data=e}}class te extends Event{constructor(e,t){super("value-type-toggled"),this.data={type:e,checked:t}}}class se extends HTMLElement{constructor(){super(),this.shadow=this.attachShadow({mode:"open"}),this.endianness="Little Endian",this.buffer=new ArrayBuffer(0),this.valueTypes=new Set,this.valueTypeModeConfig=new Map,this.showSettings=!1,this.shadow.adoptedStyleSheets=[...Q("ui/inspectorCommon.css",{enableLegacyPatching:!0})]}set data(e){this.endianness=e.endianness,this.buffer=e.value,this.valueTypes=e.valueTypes,this.valueTypeModeConfig=e.valueTypeModes||new Map,this.render()}render(){X(J`
      <style>
        :host {
          flex: auto;
          display: flex;
        }

        .value-interpreter {
          --text-highlight-color: #80868b;

          border: var(--divider-border, 1px solid #d0d0d0);
          background-color: var(--toolbar-bg-color, #f3f3f3);
          overflow: hidden;
          width: 400px;
        }

        .settings-toolbar {
          min-height: 26px;
          display: flex;
          flex-wrap: nowrap;
          justify-content: space-between;
          padding-left: 12px;
          padding-right: 12px;
          align-items: center;
        }

        .settings-toolbar-button {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 20px;
          height: 20px;
          border: none;
          background-color: transparent;
        }

        .settings-toolbar-button devtools-icon {
          height: 14px;
          width: 14px;
          min-height: 14px;
          min-width: 14px;
        }

        .settings-toolbar-button.active devtools-icon {
          --icon-color: var(--color-primary);
        }

        .divider {
          display: block;
          height: 1px;
          margin-bottom: 12px;
          background-color: var(--divider-color, #d0d0d0);
        }
      </style>
      <div class="value-interpreter">
        <div class="settings-toolbar">
          ${this.renderSetting()}
          <button data-settings="true" class="settings-toolbar-button ${this.showSettings?"active":""}" title=${K`Toggle value type settings`} @click=${this.onSettingsToggle}>
            <devtools-icon
              .data=${{iconName:"settings_14x14_icon",color:"var(--color-text-secondary)",width:"14px"}}>
            </devtools-icon>
          </button>
        </div>
        <span class="divider"></span>
        <div>
          ${this.showSettings?J`
              <devtools-linear-memory-inspector-interpreter-settings
                .data=${{valueTypes:this.valueTypes}}
                @type-toggle=${this.onTypeToggle}>
              </devtools-linear-memory-inspector-interpreter-settings>`:J`
              <devtools-linear-memory-inspector-interpreter-display
                .data=${{buffer:this.buffer,valueTypes:this.valueTypes,endianness:this.endianness,valueTypeModes:this.valueTypeModeConfig}}>
              </devtools-linear-memory-inspector-interpreter-display>`}
        </div>
      </div>
    `,this.shadow,{eventContext:this})}onEndiannessChange(e){e.preventDefault();const t=e.target.value;this.dispatchEvent(new ee(t))}renderSetting(){const e=this.onEndiannessChange.bind(this);return J`
    <label data-endianness-setting="true" title=${K`Change Endianness`}>
      <select class="chrome-select" data-endianness="true" @change=${e}>
        ${["Little Endian","Big Endian"].map((e=>J`<option value=${e} .selected=${this.endianness===e}>${S(e)}</option>`))}
      </select>
    </label>
    `}onSettingsToggle(){this.showSettings=!this.showSettings,this.render()}onTypeToggle(e){this.dispatchEvent(new te(e.data.type,e.data.checked))}}customElements.define("devtools-linear-memory-inspector-interpreter",se);var re=Object.freeze({__proto__:null,EndiannessChangedEvent:ee,ValueTypeToggledEvent:te,LinearMemoryValueInterpreter:se});const ne=/^0x[a-fA-F0-9]+$/,ie=/^0$|[1-9]\d*$/;function oe(e){const t=e.number.toString(16).padStart(e.pad,"0").toUpperCase();return e.prefix?"0x"+t:t}function ae(e){return oe({number:e,pad:8,prefix:!0})}function de(e){const t=e.match(ne),s=e.match(ie);let r=void 0;return t&&t[0].length===e.length?r=parseInt(e,16):s&&s[0].length===e.length&&(r=parseInt(e,10)),r}var le=Object.freeze({__proto__:null,HEXADECIMAL_REGEXP:ne,DECIMAL_REGEXP:ie,toHexString:oe,formatAddress:ae,parseAddress:de});const{render:ce,html:he}=r;class pe extends Event{constructor(e){super("byte-selected"),this.data=e}}class ue extends Event{constructor(e){super("resize"),this.data=e}}class me extends HTMLElement{constructor(){super(...arguments),this.shadow=this.attachShadow({mode:"open"}),this.resizeObserver=new ResizeObserver((()=>this.resize())),this.isObservingResize=!1,this.memory=new Uint8Array,this.address=0,this.memoryOffset=0,this.numRows=1,this.numBytesInRow=me.BYTE_GROUP_SIZE,this.focusOnByte=!0,this.lastKeyUpdateSent=void 0}set data(e){if(e.address<e.memoryOffset||e.address>e.memoryOffset+e.memory.length||e.address<0)throw new Error("Address is out of bounds.");if(e.memoryOffset<0)throw new Error("Memory offset has to be greater or equal to zero.");this.memory=e.memory,this.address=e.address,this.memoryOffset=e.memoryOffset,this.focusOnByte=e.focus,this.update()}connectedCallback(){a.set(this,"--byte-group-margin",me.BYTE_GROUP_MARGIN+"px")}disconnectedCallback(){this.isObservingResize=!1,this.resizeObserver.disconnect()}update(){this.updateDimensions(),this.render(),this.focusOnView(),this.engageResizeObserver()}focusOnView(){if(this.focusOnByte){const e=this.shadow.querySelector(".view");e&&e.focus()}}resize(){this.update(),this.dispatchEvent(new ue(this.numBytesInRow*this.numRows))}updateDimensions(){if(0===this.clientWidth||0===this.clientHeight||!this.shadowRoot)return this.numBytesInRow=me.BYTE_GROUP_SIZE,void(this.numRows=1);const e=this.shadowRoot.querySelector(".byte-cell"),t=this.shadowRoot.querySelector(".text-cell"),s=this.shadowRoot.querySelector(".divider"),r=this.shadowRoot.querySelector(".row");if(!(e&&t&&s&&r))return this.numBytesInRow=me.BYTE_GROUP_SIZE,void(this.numRows=1);const n=e.getBoundingClientRect().width,i=t.getBoundingClientRect().width,o=me.BYTE_GROUP_SIZE*(n+i)+me.BYTE_GROUP_MARGIN,a=s.getBoundingClientRect().width,d=this.clientWidth-(e.getBoundingClientRect().left-this.getBoundingClientRect().left)-a;if(d<o)return this.numBytesInRow=me.BYTE_GROUP_SIZE,void(this.numRows=1);this.numBytesInRow=Math.floor(d/o)*me.BYTE_GROUP_SIZE,this.numRows=Math.floor(this.clientHeight/r.clientHeight)}engageResizeObserver(){this.resizeObserver&&!this.isObservingResize&&(this.resizeObserver.observe(this),this.isObservingResize=!0)}render(){ce(he`
      <style>
        :host {
          flex: auto;
          display: flex;
          min-height: 20px;
        }

        .view {
          overflow: hidden;
          text-overflow: ellipsis;
          box-sizing: border-box;
          background: var(--color-background);
          outline: none;
        }

        .row {
          display: flex;
          height: 20px;
          align-items: center;
        }

        .cell {
          text-align: center;
          border: 1px solid transparent;
          border-radius: 2px;
        }

        .cell.selected {
          border-color: var(--color-syntax-3);
          color: var(--color-syntax-3);
          background-color: var(--item-selection-bg-color);
        }

        .byte-cell {
          min-width: 21px;
          color: var(--color-text-primary);
        }

        .byte-group-margin {
          margin-left: var(--byte-group-margin);
        }

        .text-cell {
          min-width: 14px;
          color: var(--color-syntax-3);
        }

        .address {
          color: var(--color-text-disabled);
        }

        .address.selected {
          font-weight: bold;
          color: var(--color-text-primary);
        }

        .divider {
          width: 1px;
          height: inherit;
          background-color: var(--divider-color);
          margin: 0 4px 0 4px;
        }
      </style>
      <div class="view" tabindex="0" @keydown=${this.onKeyDown}>
          ${this.renderView()}
      </div>
      `,this.shadow,{eventContext:this})}onKeyDown(e){const t=e;let s=void 0;"ArrowUp"===t.code?s=this.address-this.numBytesInRow:"ArrowDown"===t.code?s=this.address+this.numBytesInRow:"ArrowLeft"===t.code?s=this.address-1:"ArrowRight"===t.code?s=this.address+1:"PageUp"===t.code?s=this.address-this.numBytesInRow*this.numRows:"PageDown"===t.code&&(s=this.address+this.numBytesInRow*this.numRows),void 0!==s&&s!==this.lastKeyUpdateSent&&(this.lastKeyUpdateSent=s,this.dispatchEvent(new pe(s)))}renderView(){const e=[];for(let t=0;t<this.numRows;++t)e.push(this.renderRow(t));return he`${e}`}renderRow(e){const{startIndex:t,endIndex:s}={startIndex:e*this.numBytesInRow,endIndex:(e+1)*this.numBytesInRow},r={address:!0,selected:Math.floor((this.address-this.memoryOffset)/this.numBytesInRow)===e};return he`
    <div class="row">
      <span class="${n.classMap(r)}">${oe({number:t+this.memoryOffset,pad:8,prefix:!1})}</span>
      <span class="divider"></span>
      ${this.renderByteValues(t,s)}
      <span class="divider"></span>
      ${this.renderCharacterValues(t,s)}
    </div>
    `}renderByteValues(e,t){const s=[];for(let r=e;r<t;++r){const t={cell:!0,"byte-cell":!0,"byte-group-margin":r!==e&&(r-e)%me.BYTE_GROUP_SIZE==0,selected:r===this.address-this.memoryOffset},i=r<this.memory.length,o=i?he`${oe({number:this.memory[r],pad:2,prefix:!1})}`:"",a=r+this.memoryOffset,d=i?this.onSelectedByte.bind(this,a):"";s.push(he`<span class="${n.classMap(t)}" @click=${d}>${o}</span>`)}return he`${s}`}renderCharacterValues(e,t){const s=[];for(let r=e;r<t;++r){const e={cell:!0,"text-cell":!0,selected:this.address-this.memoryOffset===r},t=r<this.memory.length,i=t?he`${this.toAscii(this.memory[r])}`:"",o=t?this.onSelectedByte.bind(this,r+this.memoryOffset):"";s.push(he`<span class="${n.classMap(e)}" @click=${o}>${i}</span>`)}return he`${s}`}toAscii(e){return e>=20&&e<=127?String.fromCharCode(e):"."}onSelectedByte(e){this.dispatchEvent(new pe(e))}}me.BYTE_GROUP_MARGIN=8,me.BYTE_GROUP_SIZE=4,customElements.define("devtools-linear-memory-inspector-viewer",me);var ge=Object.freeze({__proto__:null,ByteSelectedEvent:pe,ResizeEvent:ue,LinearMemoryViewer:me});const ye=t,{render:ve,html:fe}=r;class we{constructor(e,t){if(this.address=0,e<0)throw new Error("Address should be a greater or equal to zero");this.address=e,this.callback=t}valid(){return!0}reveal(){this.callback(this.address)}}class be extends Event{constructor(e,t,s){super("memory-request"),this.data={start:e,end:t,address:s}}}class xe extends Event{constructor(e){super("address-changed"),this.data=e}}class Ee extends HTMLElement{constructor(){super(...arguments),this.shadow=this.attachShadow({mode:"open"}),this.history=new s.SimpleHistoryManager(10),this.memory=new Uint8Array,this.memoryOffset=0,this.outerMemoryLength=0,this.address=0,this.currentNavigatorMode="Submitted",this.currentNavigatorAddressLine=""+this.address,this.numBytesPerPage=4,this.valueTypes=new Set(["Integer 8-bit","Float 32-bit"]),this.endianness="Little Endian"}set data(e){if(e.address<e.memoryOffset||e.address>e.memoryOffset+e.memory.length||e.address<0)throw new Error("Address is out of bounds.");if(e.memoryOffset<0)throw new Error("Memory offset has to be greater or equal to zero.");this.memory=e.memory,this.address=e.address,this.memoryOffset=e.memoryOffset,this.outerMemoryLength=e.outerMemoryLength,this.dispatchEvent(new xe(this.address)),this.render()}render(){const{start:e,end:t}=this.getPageRangeForAddress(this.address,this.numBytesPerPage),s="Submitted"===this.currentNavigatorMode?ae(this.address):this.currentNavigatorAddressLine,r=this.isValidAddress(s),n=ye`Address has to be a number between ${ae(0)} and ${ae(this.outerMemoryLength)}`,i=r?void 0:n;ve(fe`
      <style>
        :host {
          flex: auto;
          display: flex;
        }

        .view {
          width: 100%;
          display: flex;
          flex: 1;
          flex-direction: column;
          font-family: monospace;
          padding: 9px 12px 9px 7px;
        }

        devtools-linear-memory-inspector-navigator + devtools-linear-memory-inspector-viewer {
          margin-top: 12px;
        }

        .value-interpreter {
          display: flex;
        }
      </style>
      <div class="view">
        <devtools-linear-memory-inspector-navigator
          .data=${{address:s,valid:r,mode:this.currentNavigatorMode,error:i}}
          @refresh-requested=${this.onRefreshRequest}
          @address-input-changed=${this.onAddressChange}
          @page-navigation=${this.navigatePage}
          @history-navigation=${this.navigateHistory}></devtools-linear-memory-inspector-navigator>
        <devtools-linear-memory-inspector-viewer
          .data=${{memory:this.memory.slice(e-this.memoryOffset,t-this.memoryOffset),address:this.address,memoryOffset:e,focus:"Submitted"===this.currentNavigatorMode}}
          @byte-selected=${this.onByteSelected}
          @resize=${this.resize}>
        </devtools-linear-memory-inspector-viewer>
      </div>
      <div class="value-interpreter">
        <devtools-linear-memory-inspector-interpreter
          .data=${{value:this.memory.slice(this.address-this.memoryOffset,this.address+8).buffer,valueTypes:this.valueTypes,endianness:this.endianness}}
          @value-type-toggled=${this.onValueTypeToggled}
          @endianness-changed=${this.onEndiannessChanged}>
        </devtools-linear-memory-inspector-interpreter/>
      </div>
      `,this.shadow,{eventContext:this})}onRefreshRequest(){const{start:e,end:t}=this.getPageRangeForAddress(this.address,this.numBytesPerPage);this.dispatchEvent(new be(e,t,this.address))}onByteSelected(e){this.currentNavigatorMode="Submitted";const t=Math.max(0,Math.min(e.data,this.outerMemoryLength-1));this.jumpToAddress(t)}onEndiannessChanged(e){this.endianness=e.data,this.render()}isValidAddress(e){const t=de(e);return void 0!==t&&t>=0&&t<this.outerMemoryLength}onAddressChange(e){const{address:t,mode:s}=e.data,r=this.isValidAddress(t),n=de(t);if(this.currentNavigatorAddressLine=t,void 0!==n&&r)return this.currentNavigatorMode=s,void this.jumpToAddress(n);this.currentNavigatorMode="Submitted"!==s||r?"Edit":"InvalidSubmit",this.render()}onValueTypeToggled(e){const{type:t,checked:s}=e.data;s?this.valueTypes.add(t):this.valueTypes.delete(t),this.render()}navigateHistory(e){return"Forward"===e.data?this.history.rollover():this.history.rollback()}navigatePage(e){const t="Forward"===e.data?this.address+this.numBytesPerPage:this.address-this.numBytesPerPage,s=Math.max(0,Math.min(t,this.outerMemoryLength-1));this.jumpToAddress(s)}jumpToAddress(e){if(e<0||e>=this.outerMemoryLength)return void console.warn("Specified address is out of bounds: "+e);const t=new we(e,(()=>this.jumpToAddress(e)));this.history.push(t),this.address=e,this.dispatchEvent(new xe(this.address)),this.update()}getPageRangeForAddress(e,t){const s=Math.floor(e/t)*t;return{start:s,end:Math.min(s+t,this.outerMemoryLength)}}resize(e){this.numBytesPerPage=e.data,this.update()}update(){const{start:e,end:t}=this.getPageRangeForAddress(this.address,this.numBytesPerPage);e<this.memoryOffset||t>this.memoryOffset+this.memory.length?this.dispatchEvent(new be(e,t,this.address)):this.render()}}customElements.define("devtools-linear-memory-inspector-inspector",Ee);var _e=Object.freeze({__proto__:null,MemoryRequestEvent:be,AddressChangedEvent:xe,LinearMemoryInspector:Ee});const{ls:Ie}=e;let Te;class Me extends p.VBox{constructor(){super(),this.view=Re.instance()}wasShown(){this.view.show(this.contentElement)}}class Re extends p.VBox{constructor(){super(!1);const e=document.createElement("div");e.textContent=Ie`No open inspections`,e.style.display="flex",this._tabbedPane=new u.TabbedPane,this._tabbedPane.setPlaceholderElement(e),this._tabbedPane.setCloseableTabs(!0),this._tabbedPane.setAllowTabReorder(!0,!0),this._tabbedPane.addEventListener(u.Events.TabClosed,this._tabClosed,this),this._tabbedPane.show(this.contentElement),this._tabIdToInspectorView=new Map}static instance(){return Te||(Te=new Re),Te}create(e,t,s,r){const n=new $e(s,r);this._tabIdToInspectorView.set(e,n),this._tabbedPane.appendTab(e,t,n,void 0,!1,!0),this._tabbedPane.selectTab(e)}close(e){this._tabbedPane.closeTab(e,!1)}reveal(e){this.refreshView(e),this._tabbedPane.selectTab(e)}refreshView(e){const t=this._tabIdToInspectorView.get(e);if(!t)throw new Error("View for specified tab id does not exist: "+e);t.refreshData()}_tabClosed(e){const t=e.data.tabId;this._tabIdToInspectorView.delete(t),this.dispatchEventToListeners("view-closed",t)}}class $e extends p.VBox{constructor(e,t){if(super(!1),t<0||t>e.length())throw new Error("Invalid address to show");this._memoryWrapper=e,this._address=t,this._inspector=new Ee,this._inspector.addEventListener("memory-request",(e=>{this._memoryRequested(e)})),this._inspector.addEventListener("address-changed",(e=>{this._address=e.data})),this.contentElement.appendChild(this._inspector)}wasShown(){this.refreshData()}refreshData(){Ce.getMemoryForAddress(this._memoryWrapper,this._address).then((({memory:e,offset:t})=>{this._inspector.data={memory:e,address:this._address,memoryOffset:t,outerMemoryLength:this._memoryWrapper.length()}}))}_memoryRequested(e){const{start:t,end:s,address:r}=e.data;if(r<t||r>=s)throw new Error("Requested address is out of bounds.");Ce.getMemoryRange(this._memoryWrapper,t,s).then((e=>{this._inspector.data={memory:e,address:r,memoryOffset:t,outerMemoryLength:this._memoryWrapper.length()}}))}}var Se=Object.freeze({__proto__:null,Wrapper:Me,LinearMemoryInspectorPaneImpl:Re});let Oe;class Ae{constructor(e){this.remoteArray=e}length(){return this.remoteArray.length()}async getRange(e,t){const s=Math.min(t,this.remoteArray.length());if(e<0||e>s)return console.error(`Requesting invalid range of memory: (${e}, ${t})`),Promise.resolve(new Uint8Array(0));const r=await this.extractByteArray(e,s);return new Uint8Array(r)}async extractByteArray(e,t){const s=[];for(let r=e;r<t;++r)s.push(this.remoteArray.at(r).then((e=>e.value)));return await Promise.all(s)}}async function Be(e){const t=await e.runtimeModel()._agent.invoke_callFunctionOn({objectId:e.objectId,functionDeclaration:"function() { return new Uint8Array(this instanceof ArrayBuffer? this : this.buffer); }",silent:!0,objectGroup:"linear-memory-inspector"}),s=t.getError();if(s)throw new Error("Remote object representing Uint8Array could not be retrieved: "+s);return e.runtimeModel().createRemoteObject(t.result)}class Ce extends d.SDKModelObserver{constructor(){super(),this.paneInstance=Re.instance(),this.scriptIdToRemoteObject=new Map,d.TargetManager.instance().observeModels(l.RuntimeModel,this),d.TargetManager.instance().addModelListener(c.DebuggerModel,c.Events.GlobalObjectCleared,this.onGlobalObjectClear,this),this.paneInstance.addEventListener("view-closed",this.viewClosed.bind(this)),d.TargetManager.instance().addModelListener(c.DebuggerModel,c.Events.DebuggerPaused,this.onDebuggerPause,this)}static instance(){return Oe||(Oe=new Ce,Oe)}static async getMemoryForAddress(e,t){const s=Math.max(0,t-500),r=s+1e3;return{memory:await e.getRange(s,r),offset:s}}static async getMemoryRange(e,t,s){if(t<0||t>s||t>=e.length())throw new Error("Requested range is out of bounds.");const r=Math.max(s,t+1e3);return await e.getRange(t,r)}async openInspectorView(e,t){const s=m.Context.instance().flavor(c.CallFrame);if(!s)throw new Error(`Cannot find call frame for ${e.description}.`);const r=s.script.scriptId,n=y.WorkspaceImpl.instance().uiSourceCodeForURL(s.script.sourceURL);if(!n)throw new Error("Cannot find source code object for source url: "+s.script.sourceURL);const i=n.displayName();if(this.scriptIdToRemoteObject.has(r))return this.paneInstance.reveal(r),void g.ViewManager.instance().showView("linear-memory-inspector");const o=await Be(e);this.scriptIdToRemoteObject.set(r,o);const a=new h.RemoteArray(o),d=new Ae(a);this.paneInstance.create(r,i,d,t),g.ViewManager.instance().showView("linear-memory-inspector")}modelRemoved(e){for(const[t,s]of this.scriptIdToRemoteObject)e===s.runtimeModel()&&(this.scriptIdToRemoteObject.delete(t),this.paneInstance.close(t))}onDebuggerPause(e){const t=e.data;for(const[e,s]of this.scriptIdToRemoteObject)t.runtimeModel()===s.runtimeModel()&&this.paneInstance.refreshView(e)}onGlobalObjectClear(e){const t=e.data;this.modelRemoved(t.runtimeModel())}viewClosed(e){const t=e.data,s=this.scriptIdToRemoteObject.get(t);s&&s.release(),this.scriptIdToRemoteObject.delete(e.data)}}var Pe=Object.freeze({__proto__:null,ACCEPTED_MEMORY_TYPES:["webassemblymemory","typedarray","dataview","arraybuffer"],RemoteArrayWrapper:Ae,getUint8ArrayFromObject:Be,LinearMemoryInspectorController:Ce});export{_e as LinearMemoryInspector,Pe as LinearMemoryInspectorController,Se as LinearMemoryInspectorPane,le as LinearMemoryInspectorUtils,M as LinearMemoryNavigator,re as LinearMemoryValueInterpreter,ge as LinearMemoryViewer,D as ValueInterpreterDisplay,k as ValueInterpreterDisplayUtils,Z as ValueInterpreterSettings};
