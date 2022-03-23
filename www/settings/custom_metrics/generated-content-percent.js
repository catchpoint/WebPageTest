let generatedContentPercent = 0;
const byteSize = str => new Blob([str]).size;

function replaceNonContent(markup) {
    // get content from body start onward
    markup = markup.replace(/^.*(\<body.+)$/gmi, "$1");
    //remove script tags
    markup = markup.replace(/\<script.*\<\/script\>/gmi, "$1");
    //remove style tags
    markup = markup.replace(/\<style.*\<\/style\>/gmi, "$1");
    // remove link tags
    markup = markup.replace(/\<link.*\<\/link\>/gmi, "$1");
    return markup;
}
let htmlInitial = replaceNonContent($WPT_BODIES[0].response_body);
let htmlAfter = replaceNonContent(document.documentElement.outerHTML.replace(/^.*(\<body.+)$/gmi, "$1"));

if (htmlInitial && htmlAfter) {
    let htmlInitialSize = byteSize(htmlInitial);
    let htmlAfterSize = byteSize(htmlAfter);
    generatedContentPercent = 100 - (htmlInitialSize / htmlAfterSize * 100);
}

return generatedContentPercent;