"use strict";

((window) => {
  class CountrySelector {
    constructor(selector, subdivisionSelector, isoCompliantJsonBlob) {
      this.countryList = isoCompliantJsonBlob;
      this.countries = Object.keys(this.countryList).map((code) => {
        return {
          code,
          name: this.countryList[code].name,
        };
      });
      // Fill in countries
      const countryOptions = this.countries.map(({ code, name }) => {
        return new Option(name, code);
      });

      selector.options.length = 0;
      countryOptions.forEach((opt) => {
        selector.options.add(opt);
      });

      this.countrySelector = selector;
      this.subdivisionSelector = subdivisionSelector;

      // Fill in subdivisions
      this.fillSubdivision(this.countries[0].code);
      var intervalId = null;
      // Attach listener
      this.countrySelector.addEventListener("change", (e) => {
        const code = e.target.value;
        this.fillSubdivision(code);
        if (intervalId) {
          clearInterval(intervalId);
        }
      });
      
      // form automcomplete event doesnt trigger change event 
      // so we must check for value changes when loading
      var previousValue = this.countrySelector.value;
      var self = this;

      intervalId = setInterval(function () {
        if (previousValue !== self.countrySelector.value) {
          self.fillSubdivision(self.countrySelector.value);
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
        }
      }, 100);
    }

    getSubdivisions(countryCode) {
      const country = this.countryList[countryCode];
      if (!country) {
        return {};
      }

      return country.divisions;
    }

    getCountries() {
      return this.countries;
    }

    fillSubdivision(countryCode) {
      const divisions = this.getSubdivisions(countryCode);
      const opts = Object.keys(divisions).map((key) => {
        return new Option(divisions[key], key);
      });

      this.subdivisionSelector.options.length = 0;
      opts.forEach((opt) => {
        this.subdivisionSelector.options.add(opt);
      });
    }
  }

  window.CountrySelector = CountrySelector;
})(window);
