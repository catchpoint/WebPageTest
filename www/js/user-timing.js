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
window.markUserTime = function(l) {
  var raf = window['requestAnimationFrame'] ||
    (function(callback){setTimeout(callback, 0);});
  raf(function(){
    window.performance.mark(l);
    if (window['console'] && console['timeStamp'])
      console.timeStamp(l);
  });
};
