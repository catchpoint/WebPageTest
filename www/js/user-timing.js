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
  var raf = window.requestAnimationFrame ||
    (function(callback){setTimeout(callback, 0);});
  raf(function(){
    window.performance.mark(l);
    if (console && console.timeStamp)
      console.timeStamp(l);
  });
});

(function() {
var wtt = function(g, n, t) {
  if (window._gaq)
    _gaq.push(['_trackTiming', g, n, t]);
};
utOnLoad = function() {
  var m = window.performance.getEntriesByType("mark");
  var lm={};
  for (i = 0; i < m.length; i++) {
    g = 'user';
    n = m[i].name;
    p = n.match(/([^\.]+)\.([^\.]*)/);
    if (p && p.length > 2) {
      g = p[1];
      n = p[2];
    }
    if (lm[g] == undefined || m[i].startTime > lm[g])
      lm[g] = m[i].startTime;
    wtt(g, n, m[i].startTime)
  }
  for (g in lm) {
    wtt('UserTimings', g, lm[g]);
  }
};
if (window.addEventListener)
    window.addEventListener('load', utOnLoad, false);   
else if (window.attachEvent)
    window.attachEvent('onload', utOnLoad);  
})();
