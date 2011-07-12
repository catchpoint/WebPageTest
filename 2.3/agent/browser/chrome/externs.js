// Extension API externals.
var chrome = {
  tabs: {
    getSelected: function(a, b) {},
    onUpdated: {
      addListener: function(fn) {}
    }
  },
  extension: {
    onConnect: {
      addListener: function(fn) {}
    },
    connect: function(fn) {}
  },
  cookies: {
    set: function() {}
  }
};


// Chrome built in externals.
var JSON;
var console = {
  error: function() {},
  warning: function() {},
  log: function() {}
};
var performance = {
  memory: {},
  navigation: {},
  timing: {}
};
