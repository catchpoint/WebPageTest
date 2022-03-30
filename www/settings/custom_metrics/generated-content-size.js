let generatedContent = 0;
const byteSize = str => new Blob([str]).size;

function replaceNonContent(markup) {
    // get content from body start onward
    markup = markup.replace(/^.*(\<body.+)$/gmi, "$1");
    //remove script tags
    markup = markup.replace(/\<script.*\<\/script\>/gmi, "");
    //remove style tags
    markup = markup.replace(/\<style.*\<\/style\>/gmi, "");
    // remove link tags
    markup = markup.replace(/\<link.*\<\/link\>/gmi, "");
    return markup;
}
let htmlInitial = replaceNonContent($WPT_BODIES[0].response_body);
let htmlAfter = replaceNonContent(document.documentElement.outerHTML.replace(/^.*(\<body.+)$/gmi, "$1"));

if (htmlInitial && htmlAfter) {
    let htmlInitialSize = byteSize(htmlInitial);
    let htmlAfterSize = byteSize(htmlAfter);
    generatedContent = (htmlAfterSize - htmlInitialSize) / 1024;
}

return generatedContent.toFixed(2);