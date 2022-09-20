// fix up that output in case there are style elements with cssom rules not in the source
// this often happens with dynamic stylesheet frameworks
let styles = document.querySelectorAll("style").forEach((style) => {
  let thisText = "";
  for (let i in style.sheet.cssRules) {
    if (style.sheet.cssRules[i] && style.sheet.cssRules[i].cssText) {
      thisText += style.sheet.cssRules[i].cssText;
    }
  }
  style.textContent = "/* inner styles set by WPT to match CSSOM */" + thisText;
});
return document.documentElement.outerHTML;
