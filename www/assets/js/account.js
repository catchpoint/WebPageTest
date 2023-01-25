((window) => {
  class Modal extends HTMLElement {
    constructor() {
      super();
      this._init = this._init.bind(this);
      this._observer = new MutationObserver(this._init);
    }
    connectedCallback() {
      if (this.children.length) {
        this._init();
      }
      this._observer.observe(this, { childList: true });
    }
    makeEvent(evtName) {
      if (typeof window.CustomEvent === "function") {
        return new CustomEvent(evtName, {
          bubbles: true,
          cancelable: false,
        });
      } else {
        var evt = document.createEvent("CustomEvent");
        evt.initCustomEvent(evtName, true, true, {});
        return evt;
      }
    }
    _init() {
      this.closetext = "Close dialog";
      this.closeclass = "modal_close";
      this.closed = true;

      this.initEvent = this.makeEvent("init");
      this.beforeOpenEvent = this.makeEvent("beforeopen");
      this.openEvent = this.makeEvent("open");
      this.closeEvent = this.makeEvent("close");
      this.beforeCloseEvent = this.makeEvent("beforeclose");
      this.activeElem = document.activeElement;
      this.closeBtn =
        this.querySelector("." + this.closeclass) || this.appendCloseBtn();
      this.titleElem = this.querySelector(".modal_title");
      this.enhanceMarkup();
      this.bindEvents();
      this.dispatchEvent(this.initEvent);
    }
    closest(el, s) {
      var whichMatches =
        Element.prototype.matches || Element.prototype.msMatchesSelector;
      do {
        if (whichMatches.call(el, s)) return el;
        el = el.parentElement || el.parentNode;
      } while (el !== null && el.nodeType === 1);
      return null;
    }
    appendCloseBtn() {
      var btn = document.createElement("button");
      btn.className = this.closeclass;
      btn.innerHTML = this.closetext;
      this.appendChild(btn);
      return btn;
    }

    enhanceMarkup() {
      this.setAttribute("role", "dialog");
      this.id = this.id || "modal_" + new Date().getTime();
      if (this.titleElem) {
        this.titleElem.id =
          this.titleElem.id || "modal_title_" + new Date().getTime();
        this.setAttribute("aria-labelledby", this.titleElem.id);
      }
      this.classList.add("modal");
      this.setAttribute("tabindex", "-1");
      this.overlay = document.createElement("div");
      this.overlay.className = "modal_screen";
      this.parentNode.insertBefore(this.overlay, this.nextSibling);
      this.modalLinks = "a.modal_link[href='#" + this.id + "']";
      this.changeAssocLinkRoles();
    }

    addInert() {
      var self = this;
      function inertSiblings(node) {
        if (node.parentNode) {
          for (var i in node.parentNode.childNodes) {
            var elem = node.parentNode.childNodes[i];
            if (elem !== node && elem.nodeType === 1 && elem !== self.overlay) {
              elem.inert = true;
            }
          }
          if (node.parentNode !== document.body) {
            inertSiblings(node.parentNode);
          }
        }
      }
      inertSiblings(this);
    }

    removeInert() {
      var elems = document.querySelectorAll("[inert]");
      for (var i = 0; i < elems.length; i++) {
        elems[i].inert = false;
      }
    }

    open(programmedOpen) {
      this.dispatchEvent(this.beforeOpenEvent);
      this.classList.add("modal-open");
      if (!programmedOpen) {
        this.focusedElem = this.activeElem;
      }
      this.closed = false;
      this.focus();
      this.addInert();
      this.dispatchEvent(this.openEvent);
    }

    close(programmedClose) {
      var self = this;
      this.dispatchEvent(this.beforeCloseEvent);
      this.classList.remove("modal-open");
      this.closed = true;
      self.removeInert();
      var focusedElemModal = self.closest(this.focusedElem, ".modal");
      if (focusedElemModal) {
        focusedElemModal.open(true);
      }
      if (!programmedClose) {
        this.focusedElem.focus();
      }

      this.dispatchEvent(this.closeEvent);
    }

    changeAssocLinkRoles() {
      var elems = document.querySelectorAll(this.modalLinks);
      for (var i = 0; i < elems.length; i++) {
        elems[i].setAttribute("role", "button");
      }
    }

    bindEvents() {
      var self = this;
      // close btn click
      this.closeBtn.addEventListener("click", (event) => self.close());

      // open dialog if click is on link to dialog
      window.addEventListener("click", function (e) {
        var assocLink = self.closest(e.target, self.modalLinks);
        if (assocLink) {
          e.preventDefault();
          self.open();
        }
      });

      window.addEventListener("keydown", function (e) {
        var assocLink = self.closest(e.target, self.modalLinks);
        if (assocLink && e.keyCode === 32) {
          e.preventDefault();
          self.open();
        }
      });

      window.addEventListener("focusin", function (e) {
        self.activeElem = e.target;
      });

      // click on the screen itself closes it
      this.overlay.addEventListener("mouseup", function (e) {
        if (!self.closed) {
          self.close();
        }
      });

      // click on anything outside dialog closes it too (if screen is not shown maybe?)
      window.addEventListener("mouseup", function (e) {
        if (!self.closed && !self.closest(e.target, "#" + self.id)) {
          e.preventDefault();
          self.close();
        }
      });

      // close on escape
      window.addEventListener("keydown", function (e) {
        if (e.keyCode === 27 && !self.closed) {
          e.preventDefault();
          self.close();
        }
      });

      // close on other dialog open
      window.addEventListener("beforeopen", function (e) {
        if (!self.closed && e.target !== this) {
          self.close(true);
        }
      });
    }

    disconnectedCallback() {
      this._observer.disconnect();
      // remove screen when elem is removed
      this.overlay.remove();
    }
  }

  if ("customElements" in window) {
    customElements.define("fg-modal", Modal);
  }

  window.Modal = Modal;
})(window);

(function () {
  /*
   *   This content is licensed according to the W3C Software License at
   *   https://www.w3.org/Consortium/Legal/2015/copyright-software-and-document
   *
   *   File:   sortable-table.js
   *
   *   Desc:   Adds sorting to a HTML data table that implements ARIA Authoring Practices
   */

  "use strict";

  class SortableTable {
    constructor(tableNode) {
      this.tableNode = tableNode;

      this.columnHeaders = tableNode.querySelectorAll("thead th");

      this.sortColumns = [];

      for (var i = 0; i < this.columnHeaders.length; i++) {
        var ch = this.columnHeaders[i];
        var buttonNode = ch.querySelector("button");
        if (buttonNode) {
          this.sortColumns.push(i);
          buttonNode.setAttribute("data-column-index", i);
          buttonNode.addEventListener("click", this.handleClick.bind(this));
        }
      }

      this.optionCheckbox = document.querySelector(
        'input[type="checkbox"][value="show-unsorted-icon"]'
      );

      if (this.optionCheckbox) {
        this.optionCheckbox.addEventListener(
          "change",
          this.handleOptionChange.bind(this)
        );
        if (this.optionCheckbox.checked) {
          this.tableNode.classList.add("show-unsorted-icon");
        }
      }
    }

    setColumnHeaderSort(columnIndex) {
      if (typeof columnIndex === "string") {
        columnIndex = parseInt(columnIndex);
      }

      for (var i = 0; i < this.columnHeaders.length; i++) {
        var ch = this.columnHeaders[i];
        var buttonNode = ch.querySelector("button");
        if (i === columnIndex) {
          var value = ch.getAttribute("aria-sort");
          if (value === "descending") {
            ch.setAttribute("aria-sort", "ascending");
            this.sortColumn(
              columnIndex,
              "ascending",
              ch.classList.contains("num")
            );
          } else {
            ch.setAttribute("aria-sort", "descending");
            this.sortColumn(
              columnIndex,
              "descending",
              ch.classList.contains("num")
            );
          }
        } else {
          if (ch.hasAttribute("aria-sort") && buttonNode) {
            ch.removeAttribute("aria-sort");
          }
        }
      }
    }

    sortColumn(columnIndex, sortValue, isNumber) {
      function compareValues(a, b) {
        if (sortValue === "ascending") {
          if (a.value === b.value) {
            return 0;
          } else {
            if (isNumber) {
              return a.value - b.value;
            } else {
              return a.value < b.value ? -1 : 1;
            }
          }
        } else {
          if (a.value === b.value) {
            return 0;
          } else {
            if (isNumber) {
              return b.value - a.value;
            } else {
              return a.value > b.value ? -1 : 1;
            }
          }
        }
      }

      if (typeof isNumber !== "boolean") {
        isNumber = false;
      }

      var tbodyNode = this.tableNode.querySelector("tbody");
      var rowNodes = [];
      var dataCells = [];

      var rowNode = tbodyNode.firstElementChild;

      var index = 0;
      while (rowNode) {
        rowNodes.push(rowNode);
        var rowCells = rowNode.querySelectorAll("th, td");
        var dataCell = rowCells[columnIndex];

        var data = {};
        data.index = index;
        data.value = dataCell.textContent.toLowerCase().trim();
        if (isNumber) {
          data.value = parseFloat(data.value);
        }
        dataCells.push(data);
        rowNode = rowNode.nextElementSibling;
        index += 1;
      }

      dataCells.sort(compareValues);

      // remove rows
      while (tbodyNode.firstChild) {
        tbodyNode.removeChild(tbodyNode.lastChild);
      }

      // add sorted rows
      for (var i = 0; i < dataCells.length; i += 1) {
        tbodyNode.appendChild(rowNodes[dataCells[i].index]);
      }
    }

    /* EVENT HANDLERS */

    handleClick(event) {
      var tgt = event.currentTarget;
      this.setColumnHeaderSort(tgt.getAttribute("data-column-index"));
    }

    handleOptionChange(event) {
      var tgt = event.currentTarget;

      if (tgt.checked) {
        this.tableNode.classList.add("show-unsorted-icon");
      } else {
        this.tableNode.classList.remove("show-unsorted-icon");
      }
    }
  }

  window.SortableTable = SortableTable;
})(window);

/**
 * Toggle
 */
(function (window) {
  class Toggleable {
    constructor(togglearea) {
      const id = togglearea.id;
      const buttonElements = document.querySelectorAll(
        "[data-targetid=" + id + "]"
      );
      togglearea.classList.add("toggle-close");
      this.open = false;
      this.togglearea = togglearea;

      for (let i = 0; i < buttonElements.length; i++) {
        buttonElements[i].addEventListener(
          "click",
          this.handleClick.bind(this)
        );
      }
    }

    handleClick(e) {
      const command = e.target.dataset.toggle;
      if (command == "open") {
        this.open = true;
        this.togglearea.classList.add("toggle-open");
        this.togglearea.classList.remove("toggle-close");
      } else {
        this.open = false;
        this.togglearea.classList.remove("toggle-open");
        this.togglearea.classList.add("toggle-close");
      }
    }
  }

  window.Toggleable = Toggleable;
})(window);

/**
 * HiddenContent
 */
(function (window) {
  class HiddenContent {
    constructor(hiddenContentCell) {
      const viewButton = hiddenContentCell.querySelector(".view-button");
      const hideButton = hiddenContentCell.querySelector(".hide-button");
      const hiddenArea = hiddenContentCell.querySelector(".hidden-area");

      viewButton.addEventListener("click", this.showContent.bind(this));
      hideButton.addEventListener("click", this.hideContent.bind(this));

      this.viewButton = viewButton;
      this.hideButton = hideButton;
      this.hiddenContentCell = hiddenContentCell;
      this.hiddenArea = hiddenArea;
    }

    hideContent() {
      this.hiddenArea.classList.add("closed");
      this.viewButton.classList.remove("closed");
    }

    showContent() {
      this.viewButton.classList.add("closed");
      this.hiddenArea.classList.remove("closed");
    }
  }

  window.HiddenContent = HiddenContent;
})(window);

/**
 * DeleteApiKeyBoxSet
 */
(function (window) {
  class DeleteApiKeyBoxSet {
    constructor(mainCheckbox) {
      this.selectAllBox = mainCheckbox;
      const form = this.selectAllBox.closest("form");
      const individualBoxes = form.querySelectorAll(
        "[data-apikeybox=individual]"
      );
      const deleteButtonLabel = document.querySelector(
        "[data-apikeybox=delete-button]"
      );
      const deleteButton = form.querySelector("input[type=submit]");

      this.individualBoxes = individualBoxes;
      this.deleteButton = deleteButton;
      this.deleteButtonLabel = deleteButtonLabel;

      this.selectAllBox.addEventListener(
        "change",
        this.handleMainBoxChange.bind(this)
      );
      this.individualBoxes.forEach((box) => {
        box.addEventListener(
          "change",
          this.handleIndividualBoxChange.bind(this)
        );
      });
    }

    handleMainBoxChange(e) {
      if (e.target.checked) {
        this.deleteButton.removeAttribute("disabled");
        this.deleteButton.disabled = false;
        this.deleteButtonLabel.classList.remove("disabled");

        this.individualBoxes.forEach((box) => {
          box.setAttribute("checked", "true");
          box.checked = true;
        });
      } else {
        this.deleteButton.setAttribute("disabled", "disabled");
        this.deleteButton.disabled = true;
        this.deleteButtonLabel.classList.add("disabled");

        this.individualBoxes.forEach((box) => {
          box.removeAttribute("checked");
          box.checked = false;
        });
      }
    }

    handleIndividualBoxChange(e) {
      if (e.target.checked) {
        this.deleteButton.removeAttribute("disabled");
        this.deleteButton.disabled = false;
        this.deleteButtonLabel.classList.remove("disabled");

        const allChecked = Array.from(this.individualBoxes).every(
          (box) => box.checked
        );
        if (allChecked) {
          this.selectAllBox.setAttribute("checked", "true");
          this.selectAllBox.checked = true;
        }
      } else {
        const boxes = Array.from(this.individualBoxes);
        const anyUnchecked = boxes.some((box) => !box.checked);
        const allUnchecked = boxes.every((box) => !box.checked);

        if (anyUnchecked) {
          this.selectAllBox.removeAttribute("checked");
          this.selectAllBox.checked = false;
        }

        if (allUnchecked) {
          this.deleteButton.setAttribute("disabled", "disabled");
          this.deleteButton.disabled = true;
          this.deleteButtonLabel.classList.add("disabled");
        }
      }
    }
  }

  window.DeleteApiKeyBoxSet = DeleteApiKeyBoxSet;
})(window);

((window) => {
  class ApiKeyForm {
    constructor(element) {
      this.form = element;
      const formType = element.getAttribute("data-apikey-form");
      const submitButton = document.querySelector(
        `[data-apikey-form-submit=${formType}]`
      );
      this.submit = submitButton
        ? submitButton
        : element.querySelector("[type=submit]");

      this.form.addEventListener("submit", this.preventDoubleClick.bind(this));
    }
    preventDoubleClick(e) {
      e.preventDefault();
      this.submit.classList.add("disabled");
      this.submit.setAttribute("disabled", "disabled");
      this.submit.setAttribute("aria-disabled", "true");
      this.submit.disabled = true;
      this.submit.textContent = "Submitting...";
      this.form.submit();
    }
  }

  window.ApiKeyForm = ApiKeyForm;
})(window);

/**
 * Attach all the listeners
 */
(() => {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      document.querySelectorAll(".edit-button button").forEach((el) => {
        el.addEventListener("click", (e) => {
          const card = e.target.closest("[data-modal]");
          const modal = card.dataset.modal;
          document.querySelector(`#${modal}`).open();
        });
      });

      document
        .querySelectorAll(".fg-modal .cancel-button button")
        .forEach((el) => {
          el.addEventListener("click", (e) => {
            const modal = e.target.closest(".fg-modal");
            modal.close();
          });
        });

      document
        .querySelectorAll(".fg-modal .cancel-subscription-button button")
        .forEach((el) => {
          el.addEventListener("click", (e) => {
            const modal = e.target.closest(".fg-modal");
            modal.close();
            document.querySelector("#subscription-plan-modal-confirm").open();
          });
        });

      var sortableTables = document.querySelectorAll("table.sortable");
      for (var i = 0; i < sortableTables.length; i++) {
        new SortableTable(sortableTables[i]);
      }

      var toggleableAreas = document.querySelectorAll(".toggleable");
      for (var i = 0; i < toggleableAreas.length; i++) {
        new Toggleable(toggleableAreas[i]);
      }

      var hiddenContentCells = document.querySelectorAll("td.hidden-content");
      for (var i = 0; i < hiddenContentCells.length; i++) {
        new HiddenContent(hiddenContentCells[i]);
      }

      var deleteApiKeyBoxes = document.querySelectorAll(
        "[data-apikeybox=select-all]"
      );
      for (var i = 0; i < deleteApiKeyBoxes.length; i++) {
        new DeleteApiKeyBoxSet(deleteApiKeyBoxes[i]);
      }

      attachListenerToBillingFrequencySelector();
      handleRunUpdate();

      document
        .querySelectorAll('#wpt-account-upgrade-choose input[name="plan"]')
        .forEach((s) => {
          s.addEventListener("change", (e) => {
            document.selectPlan.submit();
          });
        });
    });
  } else {
    // upgrade plan selector
    var updatePlan = document.getElementById("pro-plan-selector");
    if (updatePlan) {
      updatePlan.addEventListener("change", (e) => {
        if (e.target.value === "annual") {
          document
            .querySelectorAll(".wpt-plan-set.annual-plans")[0]
            .classList.remove("hidden");
          document
            .querySelectorAll(".wpt-plan-set.monthly-plans")[0]
            .classList.add("hidden");
        } else {
          document
            .querySelectorAll(".wpt-plan-set.annual-plans")[0]
            .classList.add("hidden");
          document
            .querySelectorAll(".wpt-plan-set.monthly-plans")[0]
            .classList.remove("hidden");
        }
      });
    }

    var cancelSub = document.getElementById("cancel-subscription");
    if (cancelSub) {
      cancelSub.addEventListener("click", (e) => {
        e.preventDefault();
        document.querySelector("#subscription-plan-modal").open();
      });
    }

    document.querySelectorAll(".edit-button button").forEach((el) => {
      el.addEventListener("click", (e) => {
        const card = e.target.closest("[data-modal]");
        const modal = card.dataset.modal;
        document.querySelector(`#${modal}`).open();
      });
    });

    document
      .querySelectorAll(".fg-modal .cancel-button button")
      .forEach((el) => {
        el.addEventListener("click", (e) => {
          const modal = e.target.closest(".fg-modal");
          modal.close();
        });
      });

    document
      .querySelectorAll(".fg-modal .cancel-subscription-button button")
      .forEach((el) => {
        el.addEventListener("click", (e) => {
          const modal = e.target.closest(".fg-modal");
          modal.close();
          document.querySelector("#subscription-plan-modal-confirm").open();
        });
      });

    // add pulse to submit button on click for any forms with this class
    var fancyForm = document.querySelectorAll(".form__pulse-wait");
    fancyForm.forEach((el) => {
      el.addEventListener("submit", (e) => {
        var submitButtons = e.target.querySelectorAll(".pill-button span");
        for (const button of submitButtons) {
          button.innerHTML = "";
          button.classList.add("dot-pulse");
          button.classList.add("dot-pulse__dark");
        }
      });
    });
    document
      .querySelectorAll('#wpt-account-upgrade-choose input[name="plan"]')
      .forEach((el) => {
        el.addEventListener("change", (e) => {
          const buttons = document.querySelectorAll(".pill-button span");
          for (const button of buttons) {
            button.innerHTML = "";
            button.classList.add("dot-pulse");
          }
          document.selectPlan.submit();
        });
      });

    var sortableTables = document.querySelectorAll("table.sortable");
    for (var i = 0; i < sortableTables.length; i++) {
      new SortableTable(sortableTables[i]);
    }

    var toggleableAreas = document.querySelectorAll(".toggleable");
    for (var i = 0; i < toggleableAreas.length; i++) {
      new Toggleable(toggleableAreas[i]);
    }

    var hiddenContentCells = document.querySelectorAll("td.hidden-content");
    for (var i = 0; i < hiddenContentCells.length; i++) {
      new HiddenContent(hiddenContentCells[i]);
    }

    var deleteApiKeyBoxes = document.querySelectorAll(
      "[data-apikeybox=select-all]"
    );
    for (var i = 0; i < deleteApiKeyBoxes.length; i++) {
      new DeleteApiKeyBoxSet(deleteApiKeyBoxes[i]);
    }

    const apiKeyForms = document.querySelectorAll("form[data-apikey-form]");
    for (let i = 0; i < apiKeyForms.length; i++) {
      new ApiKeyForm(apiKeyForms[i]);
    }

    attachListenerToBillingFrequencySelector();
    handleRunUpdate();
  }

  function attachListenerToBillingFrequencySelector() {
    var selectors = document.querySelectorAll(
      "#paid-plan-selector input[type=radio]"
    );
    selectors.forEach((s) => {
      s.addEventListener("change", (e) => {
        var monthlyCard = document.querySelector(".card .monthly");
        var annualCard = document.querySelector(".card .annual");
        if (e.target.value == "monthly") {
          monthlyCard.classList.add("selected");
          annualCard.classList.remove("selected");
        } else {
          monthlyCard.classList.remove("selected");
          annualCard.classList.add("selected");
        }
      });
    });
  }

  function handleRunUpdate() {
    var selects = document.querySelectorAll("select[name=plan]");
    selects.forEach((s) => {
      var priceDisplay = s.closest("form").querySelector(".price span");
      s.addEventListener("change", (e) => {
        var selected = e.target.options[e.target.selectedIndex];
        var price = selected.dataset["price"];
        priceDisplay.innerText = price;
      });
    });
  }
})();
