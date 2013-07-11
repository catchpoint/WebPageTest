// Support routines for automatically reporting user timing for common analytics platforms
// Currently supports Google Analytics, Boomerang and SOASTA mPulse
// In the case of boomerang, you will need to map the event names you want reported
// to timer names (for mPulse these need to be custom0, custom1, etc) using a global variable:
// rumMapping = {'aft': 'custom0'};
(function() {
var wtt = function(n, t, b) {
  t = Math.round(t);
  if (t >= 0 && t < 3600000) {
    // Google Analytics
    if (!b && window['_gaq'])
      _gaq.push(['_trackTiming', 'UserTimings', n, t]);
      
    // Boomerang/mPulse
    if (b && window['rumMapping'] && window.rumMapping[n])
      BOOMR.plugins.RT.setTimer(window.rumMapping[n], t);
  }
};
utReportRUM = function(b){
  var m = window.performance.getEntriesByType("mark");
  var lm={};
  for (i = 0; i < m.length; i++) {
    g = 'usertiming';
    if (lm[g] == undefined || m[i].startTime > lm[g])
      lm[g] = m[i].startTime;
    p = m[i].name.match(/([^\.]+)\.([^\.]*)/);
    if (p && p.length > 2 &&
        (lm[p[1]] == undefined ||
         m[i].startTime > lm[p[1]]))
        lm[p[1]] = m[i].startTime;
  }
  for (g in lm)
    wtt(g, lm[g], b);
};
utOnLoad = function() {utReportRUM(false);};
if (window['addEventListener'])
    window.addEventListener('load', utOnLoad, false);   
else if (window['attachEvent'])
    window.attachEvent('onload', utOnLoad);  

// Boomerang/mPulse support
utSent = false;
BOOMR = window.BOOMR || {};
BOOMR.plugins = BOOMR.plugins || {};
BOOMR.plugins.UserTiming = {
  init: function(config) {BOOMR.subscribe('page_ready', function(){
    if (!utSent) {
      utReportRUM(true);
      utSent=true;
      BOOMR.sendBeacon();
    }
  });},
  is_complete: function() {return utSent;}
};
})();
