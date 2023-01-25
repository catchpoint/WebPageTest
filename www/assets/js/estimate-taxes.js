(function () {
  "use strict";

  class EstimateTaxes {
    constructor(addressForm, summaryNode) {
      if (!addressForm || !summaryNode) {
        return;
      }
      this.form = addressForm;
      this.summary = summaryNode;
      this.form.addEventListener("submit", async (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();

        const pulse = e.target.querySelector(
          "button[type='submit'] span[data-id='pulse']"
        );
        const submit = e.target.querySelector(
          "button[type='submit'] span[data-id='button-text']"
        );
        submit.innerHTML = "Calculating taxes...";
        pulse.classList.add("dot-pulse");
        const fd = new FormData(e.target);
        const request = new Request("/account", {
          method: "POST",
          body: fd,
        });
        const response = await fetch(request);
        const { taxInCents, totalInCents } = await response.json();
        this.updateTaxAndTotal(taxInCents, totalInCents);
        const updated = new CustomEvent("taxes-updated", {
          bubbles: true,
          detail: fd,
        });
        submit.innerHTML = "Add Billing Address";
        pulse.classList.remove("dot-pulse");
        e.target.dispatchEvent(updated);
      });
    }

    updateTaxAndTotal(tax, total) {
      this.summary.querySelector("[data-id=taxes]").innerText =
        "$" + (tax / 100).toFixed(2);
      this.summary.querySelector("[data-id=total]").innerText =
        "$" + (total / 100).toFixed(2);
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
