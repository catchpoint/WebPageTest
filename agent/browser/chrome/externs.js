// Extension API externals.
var chrome = {
  browserAction: {
    onClicked: {
      addListener: function(fn) {}
    }
  },
  tabs: {
    executeScript: function(a, b) {},
    getSelected: function(a, b) {},
    onUpdated: {
      addListener: function(fn) {}
    }
  },
  extension: {
    onConnect: {
      addListener: function(fn) {}
    },
    connect: function(fn) {},
    getURL: function(url) {}
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
