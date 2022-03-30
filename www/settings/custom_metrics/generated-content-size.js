let generatedContent = 0;
const byteSize = str => new Blob([str]).size;

function replaceNonContent(markup) {
    let contain = document.createElement("div");
    contain.innerHTML = markup;
    // get content from body start onward
    contain.querySelectorAll("head, script, style, link").forEach(elem => {
        elem.remove();
    });
    return contain.innerHTML;
}

let htmlInitial = replaceNonContent($WPT_BODIES[0].response_body);
let htmlAfter = replaceNonContent(document.documentElement.outerHTML.replace(/^.*(\<body.+)$/gmi, "$1"));

if (htmlInitial && htmlAfter) {
    let htmlInitialSize = byteSize(htmlInitial);
    let htmlAfterSize = byteSize(htmlAfter);
    generatedContent = (htmlAfterSize - htmlInitialSize) / 1024;
}

return generatedContent.toFixed(2);