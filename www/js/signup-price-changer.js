(function () {
  "use strict";

  class PlanPriceUpdater {
    /*
  Maybe this is overengineered but yolo
  */
    constructor(formNode, submitButtonNode) {
      this.form = formNode;
      this.submitButton = submitButtonNode;
      /** wrappers are used to hide select elements */
      this.annualWrapper = this.form.querySelector(
        "div[data-id=annual-plan-select-wrapper]"
      );
      this.monthlyWrapper = this.form.querySelector(
        "div[data-id=monthly-plan-select-wrapper]"
      );
      /* these plan selects show how many runs per plan, they are visible based on what billing cycle is shown */
      this.annualSelect = this.form.querySelector(
        "div[data-id=annual-plan-select-wrapper] select[name=plan]"
      );
      this.monthlySelect = this.form.querySelector(
        "div[data-id=monthly-plan-select-wrapper]  select[name=plan]"
      );

      this.submitButtonPrice = this.submitButton.querySelector(
        "[data-id=plan-price]"
      );

      /** add change handler for the runs/plans select to change the price on the submit button */
      this.form.querySelectorAll("select[name=plan]").forEach((el) => {
        el.addEventListener("change", (e) => {
          var price = e.target.options[e.target.selectedIndex].dataset.price;

          this.updatePrice(price);
        });
      });

      this.billingCycleSelect = this.form.querySelectorAll(
        'select[name="billing-cycle"]'
      );
      //** Add change handler for the billing cycle selects */
      this.billingCycleSelect.forEach((el) => {
        el.addEventListener("change", (e) => {
          this.toggleSelect(e.target.value);
          if (e.target.value == "annual") {
            var price =
              this.annualSelect.options[this.annualSelect.selectedIndex].dataset
                .price;
          } else {
            var price =
              this.monthlySelect.options[this.monthlySelect.selectedIndex]
                .dataset.price;
          }
          this.updatePrice(price);
        });
      });
    }

    updatePrice(price) {
      this.submitButtonPrice.innerText = price;
    }

    toggleSelect(billingCycle) {
      if (billingCycle === "annual") {
        this.monthlyWrapper.classList.add("hidden");
        this.monthlySelect.disabled = true;
        this.annualWrapper.classList.remove("hidden");
        this.annualSelect.disabled = false;
      } else {
        this.monthlyWrapper.classList.remove("hidden");
        this.monthlySelect.disabled = false;
        this.annualWrapper.classList.add("hidden");
        this.annualSelect.disabled = true;
      }
    }
  }

  window.PlanPriceUpdater = PlanPriceUpdater;
})(window);

/**
 * Attach listener on formNode
 */
(() => {
  if (document.readyState != "loading") {
    var form = document.getElementById("pro-plan-form");
    var submitButton = document.getElementById("submit-pro-plan");
    new PlanPriceUpdater(form, submitButton);
  }
})();
