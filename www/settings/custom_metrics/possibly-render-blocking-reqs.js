let possibleScripts = Array.from(
  document.querySelectorAll(
    "script[src]:not([defer]):not([async]):not([type=module]"
  )
).map((elem) => elem.src);
let possibleStyleSheets = Array.from(
  document.querySelectorAll("link[href][rel=stylesheet]:not([rel=alternative])")
).map((elem) => {
  return matchMedia(elem.media).matches ? elem.href : "";
});
return possibleScripts.concat(possibleStyleSheets);
