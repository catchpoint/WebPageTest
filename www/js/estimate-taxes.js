(function () {
  "use strict";

  class EstimateTaxes {
    /*
  Maybe this is overengineered but yolo
  */
    constructor(addressForm, summaryNode) {
      this.form = addressForm;
      this.summary = summaryNode;
      this.form.addEventListener("submit", (e) => {
        e.preventDefault();
        // do something
        // taxes!
        this.updateTaxAndTotal("$1000", "$1200000000000");
      });
    }

    updateTaxAndTotal(tax, total) {
      this.summary.querySelector("[data-id=taxes]").innerText = tax;
      this.summary.querySelector("[data-id=taxes]").innerText = total;
    }
  }

  window.EstimateTaxes = EstimateTaxes;
})(window);

/**
 * Attach listener on formNode
 */
(() => {
  if (document.readyState != "loading") {
    var form = document.getElementById("plan-summary-address-form");
    var summary = document.getElementById("plan-summary");
    new EstimateTaxes(form, summary);
  }
})();
