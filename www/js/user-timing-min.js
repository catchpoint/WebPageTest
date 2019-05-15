;window.markUserTime = function(l) {
  if (window['performance'] && window.performance['mark']) {
    var raf = window['requestAnimationFrame'] ||
      (function(callback){setTimeout(callback, 0);});
    raf(function(){
      window.performance.mark(l);
      if (window['console'] && console['timeStamp'])
        console.timeStamp(l);
    });
  }
};
