let generatedContentPercent = 0;
const byteSize = str => new Blob([str]).size;

function replaceNonContent(markup) {
    let contain = document.createElement("div");
    let markupBody = markup.match(/(\<body[\s\>].+$)/gmi);
    if (markupBody) {
        markup = markupBody;
    }
    contain.innerHTML = markup;
    // get content from body start onward
    contain.querySelectorAll("script, style, link").forEach(elem => {
        elem.remove();
    });
    return contain.innerHTML;
}

let htmlInitial = replaceNonContent($WPT_BODIES[0].response_body);
let htmlAfter = replaceNonContent(document.documentElement.outerHTML);

if (htmlInitial && htmlAfter) {
    let htmlInitialSize = byteSize(htmlInitial);
    let htmlAfterSize = byteSize(htmlAfter);
    generatedContentPercent = 100 - (htmlInitialSize / htmlAfterSize * 100);
}

return generatedContentPercent.toFixed(2);