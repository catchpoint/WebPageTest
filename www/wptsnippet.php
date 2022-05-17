<?php
// Make wpt's homepage into a snippet!
// 2022, Scott Jehl and Tim Kadlec, WebPageTest
// Notes:
// - This page includes the homepage and makes CSS and Script modifications to it so that it can appear as a single submit button when loaded in an iframe
// - The homepage form is designed to populate the URL field by URL when provided, so this simply takes advantage of that feature when the iframe's src includes a url param
// - When this page is loaded in a top window instead of a frame, it displays a message about embedding the widget, including a code snippet to copy to a project

include("index.php");
?>
<style>
    form > *:not(.snippet_button),
    .home_feature,
    header,
    .alert-banner,
    form + *,
    footer
        {
        display: none !important;
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
    }
</style>

<script>
    // if the parent window is this window, it's not an iframe, so let's show a docs page on how to use the widget
    if( window.parent === window ){
        document.write(
            '<div style="padding: 2em !important; font-size: 1.1em; margin: 0 auto !important; max-width: 50em; text-align: center; "><img src="https://webpagetest.org/images/wpt-logo.svg" alt="WebPageTest by Catchpoint" style="width: 200px; margin: 0 auto; display: block;"><p style="margin: 2em 0;"><strong style="display:block; margin-bottom: .5rem;">Add a "Test this site in WebPageTest" button to your site!</strong> Copy and paste the following snippet to your site to embed a WebPageTest button:</p> ' +
            '<pre style="max-width: 90vw; overflow: auto; padding: 10px; background-color: #fff; color: #333; break-word: break-all; border: 1px solid #fff;"><code>&lt;script id="wptsnippet"&gt;(function(){ let wptframe = document.createElement("iframe"); wptframe.style.border = "none"; wptframe.style.width = "279px"; wptframe.style.height = "95px"; wptframe.loading = "lazy"; wptframe.src = "https://<?php echo  $_SERVER['HTTP_HOST']; ?>/wptsnippet.php?url=" + encodeURIComponent(location.href); document.querySelector("#wptsnippet").after(wptframe);}());&lt;/script&gt;' +
            '</div>'
        );
    }
    else{
        let form = document.querySelector("form");
        form.target = "_blank";
        let buttonContain = document.createElement("div");
        buttonContain.className = "snippet_button";buttonContain.innerHTML = '<button name="submit" type="submit" class="start_test" style="border: 1px solid #ddd; border-radius: 0;font-size: .9rem; font-weight: 700; background: #fff;">Test this site’s performance in <span style="display:flex;margin: 1em 0 0;gap:1rem;"><img src="https://webpagetest.org/images/wpt-logo-dark.svg" alt="WebPageTest by Catchpoint"> <strong style="font-weight: bold;font-size: 1rem;background: #1a2a4a;color:#fff;border-radius: 2rem;padding: 0.3em .8em;margin: 0 0.5rem; ">Go!</strong></span></button>';
        form.append(buttonContain);
    }
</script>