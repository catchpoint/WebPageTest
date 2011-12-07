// Open a link from a browser action popup.  Normal links don't work,
// because they would navigate in the popup itself.
function openLink(url) {
  chrome.tabs.create({
      url: url,
      selected: true
  });
}
