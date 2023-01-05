// this is similar to rendered-html metric
// except it includes doctype and
// rewrites CSS only conditionally
const clonedDoc = document.cloneNode(true);
const clonedStyles = clonedDoc.querySelectorAll("style");
let styles = document.querySelectorAll("style").forEach((style, idx) => {
  let generatedCSS = "";
  for (let i in style.sheet.cssRules) {
    if (style.sheet.cssRules[i] && style.sheet.cssRules[i].cssText) {
      generatedCSS += style.sheet.cssRules[i].cssText + "\n";
    }
  }
  if (!generatedCSS) {
    return;
  }
  // just count the }s before and after as a rough idea if the inner style was CSSOM'd
  if (generatedCSS.split("}").length !== style.textContent.split("}").length) {
    clonedStyles[idx].textContent =
      "/* inner styles set by WPT to match CSSOM */\n" + generatedCSS;
  }
});
let doctype = new XMLSerializer().serializeToString(clonedDoc.doctype);
if (doctype) {
  doctype += "\n";
}
return doctype + clonedDoc.documentElement.outerHTML;
