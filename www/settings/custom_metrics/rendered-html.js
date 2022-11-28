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

function doctypeToString() {
  if (!document.doctype) {
    return "";
  }
  const doctype = document.doctype;
  const parts = ["<!DOCTYPE", " "];
  parts.push(doctype.name);
  if (doctype.publicId) {
    parts.push(" PUBLIC ");
    parts.push(`"${doctype.publicId}"`);
  }
  if (doctype.systemId) {
    parts.push(" ");
    parts.push(`"${doctype.systemId}"`);
  }
  parts.push(">");
  return parts.join("");
}

let doctype = doctypeToString();
if (doctype) {
  doctype += "\n";
}

return doctype + document.documentElement.outerHTML;
