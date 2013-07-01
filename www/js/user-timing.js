;(function () {
  var object = typeof window != 'undefined' ? window : exports,
      marks = [];
  object.performance || (object.performance = {});
  object.performance.now || (
    object.performance.now = performance.now || performance.webkitNow ||
                             performance.msNow || performance.mozNow);
  if (!object.performance.now){
    var start = Date.now ? Date.now() : +(new Date());
    if (performance.timing && performance.timing)
      start = performance.timing.navigationStart
    object.performance.now = (function(){
      var nowOffset = Date.now ? Date.now() : +(new Date());
      return nowOffset - start;
    });
  }
  object.performance.mark || (
  object.performance.mark =
    object.performance.webkitMark ? object.performance.webkitMark :
    (function (label) {
      marks.push({'name':label,'entryType':'mark','startTime':object.performance.now(),'duration':0});
    }));
  object.performance.getEntriesByType || (
  object.performance.getEntriesByType =
    object.performance.webkitGetEntriesByType ? object.performance.webkitGetEntriesByType :
    (function (type) {
      return type == 'mark' ? marks : undefined;
    }));
}());

markUserTime = function(label) {
  window.performance.mark(label);
  if (console && console.timeStamp)
    console.timeStamp(label);
};
