var imgsOutViewport = [];
var allImgs = document.querySelectorAll("img");
const observer = new IntersectionObserver(
    (entries, observer) => { 
      entries.forEach(entry => {
        if( entry.isIntersecting ){
          imgsOutViewport.push({
            src: entry.target.getAttribute("src"),
            html: entry.target.outerHTML,
            currentSrc: entry.target.currentSrc,
            srcSet: entry.target.getAttribute("srcset"),
            sizes: entry.target.getAttribute("sizes"),
            priority: entry.target.getAttribute("priority"),
            loading: entry.target.getAttribute("loading"),
            naturalWidth: entry.target.naturalWidth,
            naturalHeight: entry.target.naturalHeight,
          });
        }
        observer.unobserve(entry.target);
      });
    });

  for (var i = 0; i < allImgs.length; i++) {
    observer.observe(allImgs[i]);
  }

await new Promise(r => setTimeout(r, 2000));
return imgsOutViewport;
