// Open a link from a browser action popup.  Normal links don't work,
// because they would navigate in the popup itself.
function openLink(url) {
  chrome.tabs.create({
      url: url,
      selected: true
  });
}

function makeElementOpenLinkOnClick(id, url) {
  var el = document.getElementById(id);
  el.addEventListener("click", function() {
    openLink(url);
  });
}

window.onload = function() {
  // CSP prevents us from setting onload handlers in HTML.
  makeElementOpenLinkOnClick('openExtensionsPage', 'chrome://extensions');
  makeElementOpenLinkOnClick('runAllTests', 'wpt/allTests.html');
};
