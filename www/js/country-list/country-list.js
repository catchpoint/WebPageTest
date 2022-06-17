"use strict";

class CountrySelector {
  constructor (countrySelector, subdivisionSelector, isoCompliantJsonBlob) {
    this.countryList = isoCompliantJsonBlob;
    this.countries = Object.keys(this.countryList).map((code) => {
      return {
        code,
        name: this.countryList[code].name
      };
    });
    this.countrySelector = countrySelector;
    this.subdivisionSelector = subdivisionSelector;

    // Fill in countries
    let countryOptions = "";
    for (let i = 0; i < this.countries.length; i++) {
      let option = `<option value="${this.countries[i].code}">${this.countries[i].name}</option>`;
      countryOptions.concat(option);
    }
    this.countrySelector.innerHTML = countryOptions;

    // Fill in subdivisions
    const divisions = this.getSubdivisions(this.countries[0].code);
    let subopts = "";
    // Attach listener
  }

  getSubdivisions (countryCode) {
    const country = this.countryList[countryCode];
    if (!country) {
      return {};
    }

    return country.divisions;
  }

  getCountries () {
    return this.countries;
  }
}
