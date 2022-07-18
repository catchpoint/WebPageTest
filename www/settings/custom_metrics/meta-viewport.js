var metaviewport = null;
var metaTags = document.getElementsByTagName("meta");
for (var i = 0; i < metaTags.length; i++) {
  if (metaTags[i].getAttribute("name") == "viewport") {
    metaviewport = metaTags[i].getAttribute("content");
    break;
  }
}
return metaviewport === null ? "Not found" : metaviewport;
