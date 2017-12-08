var wptImages = function(win) {
  var images = [];
  if (win) {
    var doc = win.document;
    var elements = doc.getElementsByTagName('*');
    var re = /url\((http.*)\)/ig;
    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];
      if (el.tagName == 'IMG') {
        var url = el.currentSrc || el.src;

        // Only include HTTP(S) URLs i.e. skip dataURIs
        if(url.indexOf("http") === 0) {
          images.push({'url': url, 'width': el.width, 'height': el.height, 'naturalWidth': el.naturalWidth, 'naturalHeight': el.naturalHeight});
        }
      }
      if (el.tagName == 'IFRAME') {
        try {
          var im = wptImages(el.contentWindow);
          if (im && im.length) {
            images = images.concat(im);
          }
        } catch(e) {}
      }
      if (images.length > 10000)
        break;
    }
  }
  return images;
};

return JSON.stringify(wptImages(window));
