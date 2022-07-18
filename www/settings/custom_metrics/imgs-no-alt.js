var imgsNoAlt = [];
var allImgs = document.querySelectorAll("img");
for (var i = 0; i < allImgs.length; i++) {
  if (!allImgs[i].hasAttribute("alt")) {
    imgsNoAlt.push({
      src: allImgs[i].getAttribute("src"),
      html: allImgs[i].outerHTML,
      currentSrc: allImgs[i].currentSrc,
    });
  }
}

return imgsNoAlt;
