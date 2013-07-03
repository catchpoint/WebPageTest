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
  window.performance.mark(l);
  if (console && console.timeStamp)
    console.timeStamp(l);
});
