var imgsOutViewport = [];
var allImgs = document.querySelectorAll("img");
for (var i = 0; i < allImgs.length; i++) {
  var boundingClientRect = allImgs[i].getBoundingClientRect();
  if (boundingClientRect.top >= window.innerHeight) {
    imgsOutViewport.push({
      src: allImgs[i].getAttribute("src"),
      html: allImgs[i].outerHTML,
      currentSrc: allImgs[i].currentSrc,
      srcSet: allImgs[i].getAttribute("srcset"),
      sizes: allImgs[i].getAttribute("sizes"),
      priority: allImgs[i].getAttribute("priority"),
      loading: allImgs[i].getAttribute("loading"),
      naturalWidth: allImgs[i].naturalWidth,
      naturalHeight: allImgs[i].naturalHeight,
    });
  }
}

return imgsOutViewport;
