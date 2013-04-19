{
  function WPTCheckNavTiming(){
    if (window.performance.timing['loadEventStart'] > 0) {
      var nav_time = window.performance.timing.loadEventStart - window.performance.timing.navigationStart;
      chrome.extension.sendRequest({'msg':'timing','time':nav_time});
    } else {
      setTimeout(WPTCheckNavTiming,1000);
    }
  };
  setTimeout(WPTCheckNavTiming,100);
};
