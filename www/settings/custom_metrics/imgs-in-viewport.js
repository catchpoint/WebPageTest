var imgsInViewport = [];
var allImgs = document.querySelectorAll("img");
for (var i = 0; i < allImgs.length; i++) {
  var boundingClientRect = allImgs[i].getBoundingClientRect();
  //getBoundingClientRect returns 0 if the image is hidden (display none or parent display none)
  //display none isn't enough (only catches if that image is display non, not parent)
  //so we check offsetParent, but also position fixed (in everyone but ff, position fix makes offsetParent null)
  let isVisible =
    window.getComputedStyle(allImgs[i]).display != "none" &&
    (allImgs[i].offsetParent != null ||
      window.getComputedStyle(allImgs[i]).position == "fixed");
  if (boundingClientRect.top < window.innerHeight && isVisible) {
    imgsInViewport.push({
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

return imgsInViewport;
