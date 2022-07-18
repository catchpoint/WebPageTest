// for changing the address form from a US state dropdown to a region dropdown
(function () {
  "use strict";
  class AddressState {
    usStates = [
      { name: "ALABAMA", abbreviation: "AL" },
      { name: "ALASKA", abbreviation: "AK" },
      { name: "AMERICAN SAMOA", abbreviation: "AS" },
      { name: "ARIZONA", abbreviation: "AZ" },
      { name: "ARKANSAS", abbreviation: "AR" },
      { name: "CALIFORNIA", abbreviation: "CA" },
      { name: "COLORADO", abbreviation: "CO" },
      { name: "CONNECTICUT", abbreviation: "CT" },
      { name: "DELAWARE", abbreviation: "DE" },
      { name: "DISTRICT OF COLUMBIA", abbreviation: "DC" },
      { name: "FEDERATED STATES OF MICRONESIA", abbreviation: "FM" },
      { name: "FLORIDA", abbreviation: "FL" },
      { name: "GEORGIA", abbreviation: "GA" },
      { name: "GUAM", abbreviation: "GU" },
      { name: "HAWAII", abbreviation: "HI" },
      { name: "IDAHO", abbreviation: "ID" },
      { name: "ILLINOIS", abbreviation: "IL" },
      { name: "INDIANA", abbreviation: "IN" },
      { name: "IOWA", abbreviation: "IA" },
      { name: "KANSAS", abbreviation: "KS" },
      { name: "KENTUCKY", abbreviation: "KY" },
      { name: "LOUISIANA", abbreviation: "LA" },
      { name: "MAINE", abbreviation: "ME" },
      { name: "MARSHALL ISLANDS", abbreviation: "MH" },
      { name: "MARYLAND", abbreviation: "MD" },
      { name: "MASSACHUSETTS", abbreviation: "MA" },
      { name: "MICHIGAN", abbreviation: "MI" },
      { name: "MINNESOTA", abbreviation: "MN" },
      { name: "MISSISSIPPI", abbreviation: "MS" },
      { name: "MISSOURI", abbreviation: "MO" },
      { name: "MONTANA", abbreviation: "MT" },
      { name: "NEBRASKA", abbreviation: "NE" },
      { name: "NEVADA", abbreviation: "NV" },
      { name: "NEW HAMPSHIRE", abbreviation: "NH" },
      { name: "NEW JERSEY", abbreviation: "NJ" },
      { name: "NEW MEXICO", abbreviation: "NM" },
      { name: "NEW YORK", abbreviation: "NY" },
      { name: "NORTH CAROLINA", abbreviation: "NC" },
      { name: "NORTH DAKOTA", abbreviation: "ND" },
      { name: "NORTHERN MARIANA ISLANDS", abbreviation: "MP" },
      { name: "OHIO", abbreviation: "OH" },
      { name: "OKLAHOMA", abbreviation: "OK" },
      { name: "OREGON", abbreviation: "OR" },
      { name: "PALAU", abbreviation: "PW" },
      { name: "PENNSYLVANIA", abbreviation: "PA" },
      { name: "PUERTO RICO", abbreviation: "PR" },
      { name: "RHODE ISLAND", abbreviation: "RI" },
      { name: "SOUTH CAROLINA", abbreviation: "SC" },
      { name: "SOUTH DAKOTA", abbreviation: "SD" },
      { name: "TENNESSEE", abbreviation: "TN" },
      { name: "TEXAS", abbreviation: "TX" },
      { name: "UTAH", abbreviation: "UT" },
      { name: "VERMONT", abbreviation: "VT" },
      { name: "VIRGIN ISLANDS", abbreviation: "VI" },
      { name: "VIRGINIA", abbreviation: "VA" },
      { name: "WASHINGTON", abbreviation: "WA" },
      { name: "WEST VIRGINIA", abbreviation: "WV" },
      { name: "WISCONSIN", abbreviation: "WI" },
      { name: "WYOMING", abbreviation: "WY" },
    ];

    constructor(stateWrapperNode, countryInputNode) {
      this.stateWrapperNode = stateWrapperNode;
      this.countryInputNode = countryInputNode;
      this.countryInputNode.addEventListener("change", (e) => {
        var stateSelect = stateWrapperNode.querySelectorAll(
          'select[name="state"]'
        );
        if (e.target.value !== "United States" && stateSelect.length !== 0) {
          this.createRegionalStateInput();
        } else if (
          e.target.value === "United States" &&
          stateSelect.length === 0
        ) {
          this.createUSstateSelect();
        }
        return;
      });
    }
    createUSstateSelect() {
      //create the select
      var stateSelect = document.createElement("select");
      stateSelect.name = "state";
      stateSelect.required = true;
      this.stateWrapperNode.innerHTML = "";
      this.stateWrapperNode.appendChild(stateSelect);
      for (var i = 0; i < this.usStates.length; i++) {
        var option = document.createElement("option");
        option.text = this.usStates[i].name;
        option.value = this.usStates[i].abbreviation;
        stateSelect.appendChild(option);
      }
    }

    createRegionalStateInput() {
      //create the select
      var stateInput = document.createElement("input");
      stateInput.name = "state";
      stateInput.type = "text";
      stateInput.required = true;
      this.stateWrapperNode.innerHTML = "";
      this.stateWrapperNode.appendChild(stateInput);
    }
  }
  window.AddressState = AddressState;
})(window);

/**
 * Attach listener on COUNTRY select
 */
(() => {
  if (document.readyState != "loading") {
    var stateInputWrapper = document.getElementById("regionalArea");
    document.querySelectorAll('select[name="country"]').forEach((el) => {
      new AddressState(stateInputWrapper, el);
    });
  }
})();
