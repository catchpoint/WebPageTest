import{render as e,html as t,nothing as o,Directives as i}from"../../third_party/lit-html/lit-html.js";import{ls as s}from"../../common/common.js";import{Platform as r}from"../../host/host.js";import{assertNever as n,NumberUtilities as l}from"../../platform/platform.js";import{ContextMenu as a,Widget as c}from"../ui.js";import{ResourceUtils as d}from"../../bindings/bindings.js";class h extends HTMLElement{constructor(){super(...arguments),this.shadow=this.attachShadow({mode:"open"}),this.clickHandler=()=>{},this.counters=[]}set data(e){this.counters=e.counters,this.clickHandler=e.clickHandler,this.render()}setCounts(e){if(e.length!==this.counters.length)throw new Error(`Wrong number of texts, expected ${this.counters.length} but got ${e.length}`);for(let t=0;t<e.length;++t)this.counters[t].count=e[t];this.render()}onClickHandler(e){e.preventDefault(),this.clickHandler()}render(){return e(t`
      <style>
        :host {
          white-space: normal;
        }

        .counter-button {
          cursor: pointer;
          background-color: var(--toolbar-bg-color);
          border: 1px solid var(--divider-color);
          border-radius: 2px;
          color: var(--tab-selected-fg-color);
          margin-right: 2px;
          display: inline-flex;
          align-items: center;
        }

        .counter-button:hover,
        .counter-button:focus-visible {
          background-color: var(--toolbar-hover-bg-color);
        }

        .counter-button-title {
          margin-left: 0.5ex;
        }

        .status-icon {
          margin-left: 1ex;
        }

        .status-icon:first-child {
          margin-left: inherit;
        }
      </style>
      <button class="counter-button" @click=${this.onClickHandler}>
      ${this.counters.filter((e=>Boolean(e.count))).map((e=>t`
      <devtools-icon class="status-icon"
      .data=${{iconName:e.iconName,color:e.iconColor||"",width:"1.5ex",height:"1.5ex"}}>
      </devtools-icon>
      <span class="counter-button-title">${e.count}</span>
      </button>`))}
    `,this.shadow,{eventContext:this})}}customElements.define("counter-button",h);var u=Object.freeze({__proto__:null,CounterButton:h});const m=e=>t`${e}`;var p=Object.freeze({__proto__:null,primitiveRenderer:m,codeBlockRenderer:e=>t`<code>${e}</code>`});const f=new Set(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"]);function w(e){return f.has(e)}function b(e,t){const o=e.cells.find((e=>e.columnId===t));if(void 0===o)throw new Error(`Found a row that was missing an entry for column ${t}.`);return o}function g(e){return e.renderer?e.renderer(e.value):m(e.value)}function v(e,t){const o=e.filter((e=>e.visible)).reduce(((e,t)=>e+t.widthWeighting),0),i=e.find((e=>e.id===t));if(!i)throw new Error("Could not find column with ID "+t);if(i.widthWeighting<1)throw new Error(`Error with column ${t}: width weightings must be >= 1.`);return i.visible?Math.round(i.widthWeighting/o*100):0}function C(e){const{key:t,currentFocusedCell:o,columns:i,rows:s}=e,[r,l]=o;switch(t){case"ArrowLeft":{if(r===i.findIndex((e=>e.visible)))return[r,l];let e=r;for(let t=e-1;t>=0;t--){if(i[t].visible){e=t;break}}return[e,l]}case"ArrowRight":{let e=r;for(let t=e+1;t<i.length;t++){if(i[t].visible){e=t;break}}return[e,l]}case"ArrowUp":{const e=i.some((e=>!0===e.sortable))?0:1;if(l===e)return[r,l];let t=l;for(let o=l-1;o>=e;o--){if(0===o){t=0;break}if(!s[o-1].hidden){t=o;break}}return[r,t]}case"ArrowDown":{if(0===l){const e=s.findIndex((e=>!e.hidden));return e>-1?[r,e+1]:[r,l]}let e=l;for(let t=e+1;t<s.length+1;t++){if(!s[t-1].hidden){e=t;break}}return[r,e]}default:return n(t,"Unknown arrow key: "+t)}}const x=e=>{const{columns:t,rows:o}=e,i=t.some((e=>!0===e.sortable))?0:o.findIndex((e=>!e.hidden))+1;return[t.findIndex((e=>e.visible)),i]};class y extends Event{constructor(e){super("context-menu-column-sort-click"),this.data={column:e}}}class k extends Event{constructor(){super("context-menu-header-reset-click")}}var R=Object.freeze({__proto__:null,ARROW_KEYS:f,keyIsArrowKey:w,getRowEntryForColumnId:b,renderCellValue:g,calculateColumnWidthPercentageFromWeighting:v,handleArrowKeyNavigation:C,calculateFirstFocusableCell:x,ContextMenuColumnSortClickEvent:y,ContextMenuHeaderResetClickEvent:k});function S(e,t){const o=!t.visible,i=e.data.columns.map((e=>(e===t&&(e.visible=o),e)));e.data={...e.data,columns:i}}function $(e,t){const{columns:o}=e.data;for(const i of o)i.hideable&&t.defaultSection().appendCheckboxItem(i.title,(()=>{S(e,i)}),i.visible)}function M(e,t){const o=e.data.columns.filter((e=>!0===e.sortable));if(o.length>0)for(const i of o)t.defaultSection().appendItem(i.title,(()=>{e.dispatchEvent(new y(i))}))}class E extends Event{constructor(e,t){super("column-header-click"),this.data={column:e,columnIndex:t}}}class z extends Event{constructor(e){super("new-user-filter-text",{composed:!0}),this.data={filterText:e}}}class I extends Event{constructor(e,t){super("cell-focused",{composed:!0}),this.data={cell:e,row:t}}}const L=new Set([" ","Enter"]);class _ extends HTMLElement{constructor(){super(...arguments),this.shadow=this.attachShadow({mode:"open"}),this.columns=[],this.rows=[],this.sortState=null,this.contextMenus=void 0,this.currentResize=null,this.boundOnResizePointerUp=this.onResizePointerUp.bind(this),this.boundOnResizePointerMove=this.onResizePointerMove.bind(this),this.boundOnResizePointerDown=this.onResizePointerDown.bind(this),this.focusableCell=[0,1],this.hasRenderedAtLeastOnce=!1}get data(){return{columns:this.columns,rows:this.rows,activeSort:this.sortState,contextMenus:this.contextMenus}}set data(e){if(this.columns=e.columns,this.rows=e.rows,this.sortState=e.activeSort,this.contextMenus=e.contextMenus,this.hasRenderedAtLeastOnce||(this.focusableCell=x({columns:this.columns,rows:this.rows})),this.hasRenderedAtLeastOnce){const[e,t]=this.focusableCell,o=e>this.columns.length,i=t>this.rows.length;this.focusableCell=o||i?[o?this.columns.length:e,i?this.rows.length:t]:x({columns:this.columns,rows:this.rows})}this.render()}scrollToBottomIfRequired(){if(!1===this.hasRenderedAtLeastOnce)return;const e=this.getCurrentlyFocusableCell();if(e&&e===this.shadow.activeElement)return;const t=this.shadow.querySelector("tbody tr:not(.hidden):last-child");t&&t.scrollIntoView()}getCurrentlyFocusableCell(){const[e,t]=this.focusableCell;return this.shadow.querySelector(`[data-row-index="${t}"][data-col-index="${e}"]`)}focusCell([e,t]){const[o,i]=this.focusableCell;o===e&&i===t||(this.focusableCell=[e,t]);const s=this.getCurrentlyFocusableCell();if(!s)throw new Error("Unexpected error: could not find cell marked as focusable");s.focus(),this.render()}onTableKeyDown(e){const t=e.key;if(L.has(t)){const e=this.getCurrentlyFocusableCell(),[t,o]=this.focusableCell,i=this.columns[t];e&&0===o&&i&&i.sortable&&this.onColumnHeaderClick(i,t)}if(!w(t))return;const o=C({key:t,currentFocusedCell:this.focusableCell,columns:this.columns,rows:this.rows});this.focusCell(o)}onColumnHeaderClick(e,t){this.dispatchEvent(new E(e,t))}ariaSortForHeader(e){return!e.sortable||this.sortState&&this.sortState.columnId===e.id?this.sortState&&this.sortState.columnId===e.id?"ASC"===this.sortState.direction?"ascending":"descending":void 0:"none"}renderFillerRow(){const e=this.columns.map(((e,s)=>{if(!e.visible)return o;const r=i.classMap({firstVisibleColumn:0===s});return t`<td tabindex="-1" class=${r} data-filler-row-column-index=${s}>
    ${this.renderResizeForCell([s+1,this.rows.length])}</td>`}));return t`<tr tabindex="-1" class="filler-row">${e}</tr>`}cleanUpAfterResizeColumnComplete(){this.currentResize&&(this.currentResize.documentForCursorChange.body.style.cursor=this.currentResize.cursorToRestore,this.currentResize=null)}onResizePointerDown(e){if(1!==e.buttons||r.isMac()&&e.ctrlKey)return;e.preventDefault();const t=e.target;if(!t)return;const o=t.parentElement;if(!o)return;let i=o.dataset.colIndex,s=o.dataset.rowIndex;if(o.hasAttribute("data-filler-row-column-index")&&(i=o.dataset.fillerRowColumnIndex,s=String(this.rows.length)),void 0===i||void 0===s)return;const n=[globalThis.parseInt(i,10),globalThis.parseInt(s,10)],l=[this.columns.findIndex(((e,t)=>t>n[0]&&!0===e.visible)),n[1]],a=`[data-col-index="${l[0]}"][data-row-index="${l[1]}"]`,c=this.shadow.querySelector(a);if(!c)return;const d=this.shadow.querySelector(`col[data-col-column-index="${n[0]}"]`),h=this.shadow.querySelector(`col[data-col-column-index="${l[0]}"]`);if(!d||!h)return;const u=e.target.ownerDocument;u&&(this.currentResize={leftCellCol:d,rightCellCol:h,leftCellColInitialPercentageWidth:globalThis.parseInt(d.style.width,10),rightCellColInitialPercentageWidth:globalThis.parseInt(h.style.width,10),initialLeftCellWidth:o.clientWidth,initialRightCellWidth:c.clientWidth,initialMouseX:e.x,documentForCursorChange:u,cursorToRestore:t.style.cursor},u.body.style.cursor="col-resize",t.setPointerCapture(e.pointerId),t.addEventListener("pointermove",this.boundOnResizePointerMove))}onResizePointerMove(e){if(e.preventDefault(),!this.currentResize)return;const t=this.currentResize.leftCellColInitialPercentageWidth+this.currentResize.rightCellColInitialPercentageWidth-10,o=e.x-this.currentResize.initialMouseX,i=Math.abs(o)/(this.currentResize.initialLeftCellWidth+this.currentResize.initialRightCellWidth)*100;let s,r;o>0?(s=l.clamp(this.currentResize.leftCellColInitialPercentageWidth+i,10,t),r=l.clamp(this.currentResize.rightCellColInitialPercentageWidth-i,10,t)):o<0&&(s=l.clamp(this.currentResize.leftCellColInitialPercentageWidth-i,10,t),r=l.clamp(this.currentResize.rightCellColInitialPercentageWidth+i,10,t)),s&&r&&(this.currentResize.leftCellCol.style.width=Math.floor(s)+"%",this.currentResize.rightCellCol.style.width=Math.ceil(r)+"%")}onResizePointerUp(e){e.preventDefault();const t=e.target;t&&(t.releasePointerCapture(e.pointerId),t.removeEventListener("pointermove",this.boundOnResizePointerMove),this.cleanUpAfterResizeColumnComplete())}renderResizeForCell(e){return e[0]-1===this.getIndexOfLastVisibleColumn()?t``:t`<span class="cell-resize-handle"
     @pointerdown=${this.boundOnResizePointerDown}
     @pointerup=${this.boundOnResizePointerUp}
    ></span>`}getIndexOfLastVisibleColumn(){let e=this.columns.length-1;for(;e>-1;e--){if(this.columns[e].visible)break}return e}onHeaderContextMenu(e){if(2!==e.button)return;const t=new a.ContextMenu(e);$(this,t);M(this,t.defaultSection().appendSubMenuItem(s`Sort By`)),t.defaultSection().appendItem(s`Reset Columns`,(()=>{this.dispatchEvent(new k)})),this.contextMenus&&this.contextMenus.headerRow&&this.contextMenus.headerRow(t,this.columns),t.show()}onBodyRowContextMenu(e){if(2!==e.button)return;if(!(e.target&&e.target instanceof HTMLElement))return;const t=e.target.dataset.rowIndex;if(!t)return;const o=parseInt(t,10),i=this.rows[o-1],r=new a.ContextMenu(e);M(this,r.defaultSection().appendSubMenuItem(s`Sort By`));const n=r.defaultSection().appendSubMenuItem(s`Header Options`);$(this,n),n.defaultSection().appendItem(s`Reset Columns`,(()=>{this.dispatchEvent(new k)})),this.contextMenus&&this.contextMenus.bodyRow&&this.contextMenus.bodyRow(r,this.columns,i),r.show()}render(){const s=this.columns.findIndex((e=>e.visible)),r=this.columns.some((e=>!0===e.sortable));e(t`
    <style>
      :host {
        --table-divider-color: var(--color-details-hairline);
        --toolbar-bg-color: var(--color-background-elevation-1);
        --selected-row-color: var(--color-background-elevation-1);

        height: 100%;
        display: block;
      }

      /* Ensure that vertically we don't overflow */
      .wrapping-container {
        overflow-y: scroll;

        /* Use max-height instead of height to ensure that the
           table does not use more space than necessary. */
        height: 100%;
        position: relative;
      }

      table {
        border-spacing: 0;
        width: 100%;
        height: 100%;

        /* To make sure that we properly hide overflowing text
           when horizontal space is too narrow. */
        table-layout: fixed;
      }

      tr {
        outline: none;
      }

      tbody tr {
        background-color: var(--color-background);
      }

      tbody tr.selected {
        background-color: var(--selected-row-color);
      }

      td,
      th {
        padding: 1px 4px;

        /* Divider between each cell, except the first one (see below) */
        border-left: 1px solid var(--table-divider-color);
        color: var(--color-text-primary);
        line-height: 18px;
        height: 18px;
        user-select: text;

        /* Ensure that text properly cuts off if horizontal space is too narrow */
        white-space: nowrap;
        text-overflow: ellipsis;
        overflow: hidden;
        position: relative;
      }

      .cell-resize-handle {
        right: 0;
        top: 0;
        height: 100%;
        width: 20px;
        cursor: col-resize;
        position: absolute;
      }

      /* There is no divider before the first cell */
      td.firstVisibleColumn,
      th.firstVisibleColumn {
        border-left: none;
      }

      th {
        font-weight: normal;
        text-align: left;
        border-bottom: 1px solid var(--table-divider-color);
        position: sticky;
        top: 0;
        z-index: 2;
        background-color: var(--toolbar-bg-color);
      }

      .hidden {
        display: none;
      }

      .filler-row td {
        /* By making the filler row cells 100% they take up any extra height,
         * leaving the cells with content to be the regular height, and the
         * final filler row to be as high as it needs to be to fill the empty
         * space.
         */
        height: 100%;
        pointer-events: none;
      }

      .filler-row td .cell-resize-handle {
        pointer-events: all;
      }

      [aria-sort]:hover {
        cursor: pointer;
      }

      [aria-sort="descending"]::after {
        content: " ";
        border-left: 0.3em solid transparent;
        border-right: 0.3em solid transparent;
        border-top: 0.3em solid black;
        position: absolute;
        right: 0.5em;
        top: 0.6em;
      }

      [aria-sort="ascending"]::after {
        content: " ";
        border-bottom: 0.3em solid black;
        border-left: 0.3em solid transparent;
        border-right: 0.3em solid transparent;
        position: absolute;
        right: 0.5em;
        top: 0.6em;
      }
    </style>
    <div class="wrapping-container">
      <table
        aria-rowcount=${this.rows.length}
        aria-colcount=${this.columns.length}
        @keydown=${this.onTableKeyDown}
      >
        <colgroup>
          ${this.columns.map(((e,i)=>{const s=`width: ${v(this.columns,e.id)}%`;return e.visible?t`<col style=${s} data-col-column-index=${i}>`:o}))}
        </colgroup>
        <thead>
          <tr @contextmenu=${this.onHeaderContextMenu}>
            ${this.columns.map(((e,o)=>{const n=i.classMap({hidden:!e.visible,firstVisibleColumn:o===s}),l=r&&o===this.focusableCell[0]&&0===this.focusableCell[1];return t`<th class=${n}
                data-grid-header-cell=${e.id}
                @click=${()=>{this.focusCell([o,0]),this.onColumnHeaderClick(e,o)}}
                title=${e.title}
                aria-sort=${i.ifDefined(this.ariaSortForHeader(e))}
                aria-colindex=${o+1}
                data-row-index='0'
                data-col-index=${o}
                tabindex=${i.ifDefined(r?l?"0":"-1":void 0)}
              >${e.title}${this.renderResizeForCell([o+1,0])}</th>`}))}
          </tr>
        </thead>
        <tbody>
          ${this.rows.map(((e,o)=>{const r=this.getCurrentlyFocusableCell(),[,n]=this.focusableCell,l=o+1,a=!!r&&(r===this.shadow.activeElement&&l===n),c=i.classMap({selected:a,hidden:!0===e.hidden});return t`
              <tr
                aria-rowindex=${o+1}
                class=${c}
                @contextmenu=${this.onBodyRowContextMenu}
              >${this.columns.map(((o,r)=>{const n=b(e,o.id),a=i.classMap({hidden:!o.visible,firstVisibleColumn:r===s}),c=r===this.focusableCell[0]&&l===this.focusableCell[1],d=g(n);return t`<td
                  class=${a}
                  title=${n.title||String(n.value)}
                  tabindex=${c?"0":"-1"}
                  aria-colindex=${r+1}
                  data-row-index=${l}
                  data-col-index=${r}
                  data-grid-value-cell-for-column=${o.id}
                  @focus=${()=>{this.dispatchEvent(new I(n,e))}}
                  @click=${()=>{this.focusCell([r,l])}}
                >${d}${this.renderResizeForCell([r+1,l])}</span></td>`}))}
            `}))}
         ${this.renderFillerRow()}
        </tbody>
      </table>
    </div>
    `,this.shadow,{eventContext:this}),this.scrollToBottomIfRequired(),this.hasRenderedAtLeastOnce=!0}}customElements.define("devtools-data-grid",_);var O=Object.freeze({__proto__:null,ColumnHeaderClickEvent:E,NewUserFilterTextEvent:z,BodyCellFocusedEvent:I,DataGrid:_});class P extends HTMLElement{constructor(){super(...arguments),this.shadow=this.attachShadow({mode:"open"}),this.hasRenderedAtLeastOnce=!1,this.columns=[],this.rows=[],this.contextMenus=void 0,this.originalColumns=[],this.originalRows=[],this.sortState=null,this.filters=[]}get data(){return{columns:this.originalColumns,rows:this.originalRows,filters:this.filters,contextMenus:this.contextMenus}}set data(e){this.originalColumns=e.columns,this.originalRows=e.rows,this.contextMenus=e.contextMenus,this.filters=e.filters||[],this.contextMenus=e.contextMenus,this.columns=[...this.originalColumns],this.rows=this.cloneAndFilterRows(e.rows,this.filters),!this.hasRenderedAtLeastOnce&&e.initialSort&&(this.sortState=e.initialSort,this.sortRows(this.sortState)),this.render()}testRowWithFilter(e,t){let o=!1;const{key:i,text:s,negative:r,regex:n}=t;let l;if(i){const t=b(e,i);l=JSON.stringify(t.value).toLowerCase()}else l=JSON.stringify(e.cells.map((e=>e.value))).toLowerCase();return n?o=n.test(l):s&&(o=l.includes(s.toLowerCase())),r?!o:o}cloneAndFilterRows(e,t){return 0===t.length?[...e]:e.map((e=>{let o=!0;for(const i of t){if(!this.testRowWithFilter(e,i)){o=!1;break}}return{...e,hidden:!o}}))}sortRows(e){const{columnId:t,direction:o}=e;this.rows.sort(((e,i)=>{const s=b(e,t),r=b(i,t),n="number"==typeof s.value?s.value:String(s.value).toUpperCase(),l="number"==typeof r.value?r.value:String(r.value).toUpperCase();return n<l?"ASC"===o?-1:1:n>l?"ASC"===o?1:-1:0})),this.render()}onColumnHeaderClick(e){const{column:t}=e.data;this.applySortOnColumn(t)}applySortOnColumn(e){if(this.sortState&&this.sortState.columnId===e.id){const{columnId:e,direction:t}=this.sortState;this.sortState="DESC"===t?null:{columnId:e,direction:"DESC"}}else this.sortState={columnId:e.id,direction:"ASC"};this.sortState?this.sortRows(this.sortState):(this.rows=[...this.originalRows],this.render())}onContextMenuColumnSortClick(e){this.applySortOnColumn(e.data.column)}onContextMenuHeaderResetClick(){this.sortState=null,this.rows=[...this.originalRows],this.render()}render(){e(t`
      <style>
        :host {
          display: block;
          height: 100%;
          overflow: hidden;
        }
      </style>
      <devtools-data-grid .data=${{columns:this.columns,rows:this.rows,activeSort:this.sortState,contextMenus:this.contextMenus}}
        @column-header-click=${this.onColumnHeaderClick}
        @context-menu-column-sort-click=${this.onContextMenuColumnSortClick}
        @context-menu-header-reset-click=${this.onContextMenuHeaderResetClick}
     ></devtools-data-grid>
    `,this.shadow,{eventContext:this}),this.hasRenderedAtLeastOnce=!0}}customElements.define("devtools-data-grid-controller",P);var H=Object.freeze({__proto__:null,DataGridController:P});class A extends c.VBox{constructor(e){super(!0,!0),this.dataGrid=new P,this.dataGrid.data=e,this.contentElement.appendChild(this.dataGrid)}data(){return this.dataGrid.data}update(e){this.dataGrid.data=e}}var T=Object.freeze({__proto__:null,DataGridControllerIntegrator:A});const F=e=>void 0!==e;class D extends HTMLElement{constructor(){super(...arguments),this.shadow=this.attachShadow({mode:"open"}),this.iconPath="",this.color="rgb(110 110 110)",this.width="100%",this.height="100%"}set data(e){const{width:t,height:o}=e;this.color=e.color,this.width=F(t)?t:F(o)?o:this.width,this.height=F(o)?o:F(t)?t:this.height,this.iconPath="iconPath"in e?e.iconPath:`Images/${e.iconName}.svg`,"iconName"in e&&(this.iconName=e.iconName),this.render()}get data(){const e={color:this.color,width:this.width,height:this.height};return this.iconName?{...e,iconName:this.iconName}:{...e,iconPath:this.iconPath}}getStyles(){const{iconPath:e,width:t,height:o,color:i}=this,s={width:t,height:o,display:"block"};return i?{...s,webkitMaskImage:`url(${e})`,webkitMaskPosition:"center",webkitMaskRepeat:"no-repeat",webkitMaskSize:"100%",backgroundColor:`var(--icon-color, ${i})`}:{...s,backgroundImage:`url(${e})`,backgroundPosition:"center",backgroundRepeat:"no-repeat",backgroundSize:"100%"}}render(){e(t`
      <style>
        :host {
          display: inline-block;
          white-space: nowrap;
        }
      </style>
      <div class="icon-basic" style=${i.styleMap(this.getStyles())}></div>
    `,this.shadow)}}customElements.get("devtools-icon")||customElements.define("devtools-icon",D);var N=Object.freeze({__proto__:null,Icon:D});class W extends Event{constructor(e){super("linkifier-activated",{bubbles:!0,composed:!0}),this.data=e}}class U extends HTMLElement{constructor(){super(...arguments),this.shadow=this.attachShadow({mode:"open"}),this.url=""}set data(e){this.url=e.url,this.lineNumber=e.lineNumber,this.columnNumber=e.columnNumber,this.render()}onLinkActivation(e){e.preventDefault();const t=new W({url:this.url,lineNumber:this.lineNumber,columnNumber:this.columnNumber});this.dispatchEvent(t)}render(){if(!this.url)throw new Error("Cannot construct a Linkifier without providing a valid string URL.");return e(t`
      <style>
          .link:link,
          .link:visited {
            color: var(--color-link);
            text-decoration: underline;
            cursor: pointer;
          }
      </style>
      <a class="link" href=${this.url} @click=${this.onLinkActivation}>${function(e,t){if(e){let o=""+d.displayNameForURL(e);return void 0!==t&&(o+=":"+(t+1)),o}throw new Error("New linkifier component error: don't know how to generate link text for given arguments")}(this.url,this.lineNumber)}</a>
    `,this.shadow,{eventContext:this})}}customElements.define("devtools-linkifier",U);var j=Object.freeze({__proto__:null,LinkifierClick:W,Linkifier:U});class B extends HTMLElement{constructor(){super(...arguments),this.shadow=this.attachShadow({mode:"open"}),this.reportTitle=""}set data({reportTitle:e}){this.reportTitle=e,this.render()}connectedCallback(){this.render()}render(){e(t`
      <style>
        .content {
          background-color: var(--color-background);
          overflow: auto;
          display: grid;
          grid-template-columns: min-content auto;
        }

        .report-title {
          padding: 12px 24px;
          font-size: 15px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          border-bottom: 1px solid var(--color-details-hairline);
          color: var(--color-text-primary);
          background-color: var(--color-background);
        }
      </style>

      ${this.reportTitle?t`<div class="report-title">${this.reportTitle}</div>`:o}
      <div class="content">
        <slot></slot>
      </div>
    `,this.shadow)}}class G extends HTMLElement{constructor(){super(...arguments),this.shadow=this.attachShadow({mode:"open"})}connectedCallback(){this.render()}render(){e(t`
      <style>
        :host {
          grid-column-start: span 2;
        }

        .section-header {
          padding: 12px;
          margin-left: 18px;
          display: flex;
          flex-direction: row;
          align-items: center;
          flex: auto;
          text-overflow: ellipsis;
          overflow: hidden;
          font-weight: bold;
          color: var(--color-text-primary);
        }
      </style>
      <div class="section-header">
        <slot></slot>
      </div>
    `,this.shadow)}}class V extends HTMLElement{constructor(){super(...arguments),this.shadow=this.attachShadow({mode:"open"})}connectedCallback(){this.render()}render(){e(t`
      <style>
        :host {
          grid-column-start: span 2;
        }

        .section-divider {
          margin-top: 12px;
          border-bottom: 1px solid var(--color-details-hairline);
        }
      </style>
      <div class="section-divider">
      </div>
    `,this.shadow)}}class q extends HTMLElement{constructor(){super(...arguments),this.shadow=this.attachShadow({mode:"open"})}connectedCallback(){this.render()}render(){e(t`
      <style>
        :host {
          line-height: 28px;
          margin: 8px 0 0 0;
        }

        .key {
          color: var(--color-text-secondary);
          padding: 0 6px;
          text-align: right;
          white-space: pre;
        }
      </style>
      <div class="key"><slot></slot></div>
    `,this.shadow)}}class K extends HTMLElement{constructor(){super(...arguments),this.shadow=this.attachShadow({mode:"open"})}connectedCallback(){this.render()}render(){e(t`
      <style>
        :host {
          line-height: 28px;
          margin: 8px 0 0 0;
        }

        .value {
          color: var(--color-text-primary);
          margin-inline-start: 0;
          padding: 0 6px;
        }
      </style>
      <div class="value"><slot></slot></div>
    `,this.shadow)}}customElements.define("devtools-report",B),customElements.define("devtools-report-section-header",G),customElements.define("devtools-report-key",q),customElements.define("devtools-report-value",K),customElements.define("devtools-report-divider",V);var J=Object.freeze({__proto__:null,Report:B,ReportSectionHeader:G,ReportSectionDivider:V,ReportKey:q,ReportValue:K});export{u as CounterButton,O as DataGrid,H as DataGridController,T as DataGridControllerIntegrator,p as DataGridRenderers,R as DataGridUtils,N as Icon,j as Linkifier,J as ReportView};
