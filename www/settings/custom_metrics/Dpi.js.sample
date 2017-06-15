var one = { dpi: 96, dpcm: 96 / 2.54 };
var ie = function() {
  return Math.sqrt(screen.deviceXDPI * screen.deviceYDPI) / one.dpi;
};
var dppx = function() {
  return typeof window == 'undefined' ? 0 : +window.devicePixelRatio || ie() || 0;
};
var dpcm = function() {
  return dppx() * one.dpcm;
};
var dpi = function() {
  return dppx() * one.dpi;
};
var calcDpi = function() {
  return { dppx: dppx(), dpcm: dpcm(), dpi: dpi() };
};
return JSON.stringify(calcDpi());
