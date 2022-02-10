var imgsInViewport = [];
var allImgs = document.querySelectorAll("img");
for (var i = 0; i < allImgs.length; i++) {
 var boundingClientRect = allImgs[i].getBoundingClientRect();
 if ( boundingClientRect.top < window.innerHeight) {
  imgsInViewport.push({
      src: allImgs[i].src,
      html: allImgs[i].outerHTML,
      currentSrc: allImgs[i].currentSrc,
      srcSet: allImgs[i].srcSet,
      sizes: allImgs[i].sizes,
      priority: allImgs[i].getAttribute("priority"),
      loading: allImgs[i].getAttribute("loading")
  });
 }
}

return imgsInViewport;