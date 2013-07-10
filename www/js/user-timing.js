;(function () {
  var w = typeof window != 'undefined' ? window : exports,
      marks = [];
  w.performance || (w.performance = {});
  w.performance.now || (
    w.performance.now = performance.now || performance.webkitNow ||
                             performance.msNow || performance.mozNow);
  if (!w.performance.now){
    var s = Date.now ? Date.now() : +(new Date());
    if (performance.timing && performance.timing)
      s = performance.timing.navigationStart
    w.performance.now = (function(){
      var n = Date.now ? Date.now() : +(new Date());
      return n-s;
    });
  }
  w.performance.mark || (
  w.performance.mark =
    w.performance.webkitMark ? w.performance.webkitMark :
    (function (l) {
      marks.push({'name':l,'entryType':'mark','startTime':w.performance.now(),'duration':0});
    }));
  w.performance.getEntriesByType || (
  w.performance.getEntriesByType =
    w.performance.webkitGetEntriesByType ? w.performance.webkitGetEntriesByType :
    (function (t) {
      return t == 'mark' ? marks : undefined;
    }));
}());
markUserTime = (function(l) {
  var raf = window['requestAnimationFrame'] ||
    (function(callback){setTimeout(callback, 0);});
  raf(function(){
    window.performance.mark(l);
    if (console && console.timeStamp)
      console.timeStamp(l);
  });
});

// Support routines for automatically reporting user timing for common analytics platforms
// Currently supports Google Analytics, Boomerang and SOASTA mPulse
// In the case of mPulse, you will need to map the event names you want reported
// to custom0, custom1, etc using a global variable:
// mPulseMapping = {'aft': 'custom0'};
(function() {
var wtt = function(g, n, t, b) {
  if (t >= 0 && t < 3600000) {
    // Google Analytics
    if (!b && window['_gaq'])
      _gaq.push(['_trackTiming', g, n, t]);
      
    // Boomerang/mPulse
    if (b && window['BOOMR'] && BOOMR['plugins'] &&
        BOOMR.plugins['RT'] && BOOMR.plugins.RT['setTimer']) {
      if (window['mPulseMapping']) {
        if (window.mPulseMapping[n])
          BOOMR.plugins.RT.setTimer(window.mPulseMapping[n], t);
      } else {
        n = n.replace(/[^0-9a-zA-Z_]/g,'_');
        BOOMR.plugins.RT.setTimer(n, t);
      }
    }
  }
};
utSent = false;
utReportRUM = function(b){
  var m = window.performance.getEntriesByType("mark");
  var lm={};
  for (i = 0; i < m.length; i++) {
    g = 'usertiming';
    n = m[i].name;
    p = n.match(/([^\.]+)\.([^\.]*)/);
    if (p && p.length > 2) {
      g = p[1];
      n = p[2];
    }
    if (lm[g] == undefined || m[i].startTime > lm[g])
      lm[g] = m[i].startTime;
    wtt(g, n, m[i].startTime, b)
  }
  for (g in lm)
    wtt('UserTimings', g, lm[g], b);
  if (b && !utSent && window['BOOMR'] && BOOMR.sendBeacon) {
    utSent = true;
    BOOMR.sendBeacon();
  }
};
utOnLoad = function() {utReportRUM(false);};
if (window['addEventListener'])
    window.addEventListener('load', utOnLoad, false);   
else if (window['attachEvent'])
    window.attachEvent('onload', utOnLoad);  

// Boomerang/mPulse support
BOOMR = window.BOOMR || {};
BOOMR.plugins = BOOMR.plugins || {};
BOOMR.plugins.UserTiming = {
  init: function(config) {BOOMR.subscribe('page_ready', function(){utReportRUM(true);});},
  is_complete: function() {return utSent;}
};
})();
