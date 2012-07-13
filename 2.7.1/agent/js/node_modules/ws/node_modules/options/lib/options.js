function Options(defaults) {
  var internalValues = {};
  var values = this.value = {};
  Object.keys(defaults).forEach(function(key) {
    internalValues[key] = defaults[key];
    Object.defineProperty(values, key, {
      get: function() { return internalValues[key]; },
      configurable: false,
      enumerable: true
    });
  });
  this.reset = function() {
    Object.keys(defaults).forEach(function(key) {
      internalValues[key] = defaults[key];
    });
  }
  this.merge = function(options, required) {
    options = options || {};
    if (Object.prototype.toString.call(required) === '[object Array]') {
      var missing = [];
      for (var i = 0, l = required.length; i < l; ++i) {
        var key = required[i];
        if (typeof options[key] === 'undefined') {
          missing.push(key);
        }
      }
      if (missing.length > 0) {
        if (missing.length > 1) {
          throw new Error('options ' + 
            missing.slice(0, missing.length - 1).join(', ') + ' and ' +
            missing[missing.length - 1] + ' must be defined');
        }
        else throw new Error('option ' + missing[0] + ' must be defined'); 
      }
    }
    Object.keys(options).forEach(function(key) {
      if (typeof internalValues[key] !== 'undefined') {
        internalValues[key] = options[key];
      }
    });
    return this;
  }
  this.copy = function(keys) {
    var obj = {};
    Object.keys(defaults).forEach(function(key) {
      if (keys.indexOf(key) !== -1) {
        obj[key] = values[key];
      }
    });
    return obj;
  }
  Object.freeze(values);
  Object.freeze(this);
}

module.exports = Options;
