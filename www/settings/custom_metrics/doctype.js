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
