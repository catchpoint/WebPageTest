let generatedContent = 0;
const byteSize = (str) => new Blob([str]).size;

let htmlInitial = $WPT_BODIES[0].response_body;
let htmlAfter = document.documentElement.outerHTML;

if (htmlInitial && htmlAfter) {
  let htmlInitialSize = byteSize(htmlInitial);
  let htmlAfterSize = byteSize(htmlAfter);
  generatedContent = (htmlAfterSize - htmlInitialSize) / 1024;
}

return generatedContent.toFixed(2);
