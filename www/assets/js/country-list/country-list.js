"use strict";

((window) => {
  class CountrySelector {
    constructor(selector, subdivisionSelector, isoCompliantJsonBlob, initialCountry, initialState) {
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
      this.countrySelector.value = initialCountry;

      // Fill in subdivisions
      this.fillSubdivision(initialCountry ?? this.countries[0].code);

      this.subdivisionSelector.value = initialState;

      // Attach listener
      this.countrySelector.addEventListener("change", (e) => {
        const code = e.target.value;
        this.fillSubdivision(code);
      });
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
      this.subdivisionSelector.value = undefined;
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