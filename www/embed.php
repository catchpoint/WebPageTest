<?php
// Make wpt's homepage into an embed that will run a test on a remote site
// Notes:
// - This page includes the homepage, without modification, and adds CSS and Script modifications to it so that the page can appear as a single submit button when loaded in an iframe
// - The homepage is designed to populate its form's URL field by URL when provided, so this simply takes advantage of that feature by creating an iframe with a src that includes a url param matching the parent site
// - When this page is loaded in a top window instead of a frame, it displays a message about embedding the widget, including a code snippet to copy for usage

include("index.php");
?>
<style>
    form > *:not(.snippet_button),
    .home_feature,
    header,
    .alert-banner,
    form + *,
    footer,
    wpt-header
        {
        display: none !important;
        max-width: none;
    }
    .home_content {
        max-width: none;
    }
    div, form, body {
        margin: 0 !important;
        padding: 0 !important;
        width: auto;
        height: auto;  
        background: transparent;
    }
    body {
       display: block;
       background: #fff !important;
    }
</style>
<script>
    // if the parent window is this window, it's not an iframe, so let's show a docs page on how to use the widget
    if( window.parent === window ){
        document.write(
            '<style>body{background: #1b2a4a !important;}</style><div style="padding: 2em !important; font-size: 1.1em; margin: 0 auto !important; max-width: 50em; text-align: center; "><img src="/images/wpt-logo.svg" alt="WebPageTest by Catchpoint" style="width: 200px; margin: 0 auto; display: block;"><p style="margin: 2em 0;"><strong style="display:block; margin-bottom: .5rem;">Add a "Test this site in WebPageTest" button to your site!</strong> Copy and paste the following snippet to your site to embed a WebPageTest button:</p> ' +
            '<pre style="max-width: 90vw; overflow: auto; padding: 10px; background-color: #fff; color: #333; break-word: break-all; border: 1px solid #fff;"><code>&lt;script id="wptsnippet"&gt;(function(){ let wptframe = document.createElement("iframe"); wptframe.style.border = "0"; wptframe.style.width = "289px"; wptframe.style.height = "102px"; wptframe.loading = "lazy"; wptframe.src = "https://<?php echo  $_SERVER['HTTP_HOST']; ?>/embed.php?url=" + encodeURIComponent(location.href); document.querySelector("#wptsnippet").after(wptframe);}());&lt;/script&gt;' +
            '</div>'
        );
    }
    else{
        let form = document.querySelector("form");
        form.target = "_blank";
        let buttonContain = document.createElement("div");
        buttonContain.className = "snippet_button";buttonContain.innerHTML = '<button name="submit" type="submit" class="start_test" style=" border-radius: 0;font-size: .9rem; color: #141f32; width: 100%; border: 1px solid #ddd; text-align: center; font-weight: 700; background: #fff; display: block; margin: 0 auto;">Test this site’s performance in <span style="display:flex;margin: 1em auto 0;gap:.5rem;align-items: center; justify-content: center;"><img src="/images/wpt-logo-dark.svg" alt="WebPageTest by Catchpoint"> <strong style="font-weight: bold;font-size: 1rem;background: #1a2a4a;color:#fff;border-radius: 2rem;padding: 0.3em .8em;margin: 0 0.5rem; ">Go!</strong></span></button>';
        form.append(buttonContain);
    }
</script>