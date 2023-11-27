<?php

$quotes = array(
    array(
        'quote' => 'The best professional web performance investigators I know use WPT as a critical part of theyr workflows, and it\'s the center or mine.',
        'author' => 'Alex Russel <span>Program Manager, Microsoft Edge</span>'
    ),
    /* array('quote' => '<a href="https://product.webpagetest.org/experiments">Experiments</a> are a game changer for quantifying the speed impact of performance optimizations. What took days of technical work is now just a few clicks. Not only will this save tons of time, it will let us test and iterate ideas to find the right mix of recommendations efficiently.<br><b>I’m blown away this exists, it feels like magic.</b>',
           'author' => 'Todd Parker <span>Partner, Filament Group</span>'),
    array('quote' => 'The best professional web performance investigators I know use WPT as a critical part of their workflows, and it\'s the center of mine.',
          'author' => 'Alex Russell <span>Program Manager, Microsoft Edge</span>'),
    array('quote' => 'One of the cool features of WebPageTest is that it can generate a filmstrip of screen snapshots taken during a web page load, enabling us to quantify how a page loads, visually. This view makes it significantly easier to determine how long the page is blank for, and how long it takes for the most important content to render.</p><p>Being able to look at the results in this way, provides the ability to empathise with the user.',
          'author' => 'Andrew Galloni <span>Engineering Director at Cloudflare</span>'),
    array('quote' => 'WebPage Test measures web performance metrics in real browsers, is highly programmable, and could scale to test millions of sites per day.',
          'author' => 'Yevgen Safranov <span>Software Engineer at Cloudflare</span>'),
    array('quote' => 'Snyk uses WebPageTest to perform 3rd party library detection and vulnerability scanning that reveals potential security vulnerabilities in your website pages.',
          'author' => 'Liran Tal <span>Developer Relations at Snyk</span>'),*/
);
$quote = $quotes[array_rand($quotes)];
?>
<?php include(INCLUDES_PATH . '/include/carousel.inc'); ?>
<figure class="testimonial">
    <blockquote>
        <p>“<?php echo $quote['quote']; ?>”</p>
    </blockquote>
    <figcaption><cite><?php echo $quote['author']; ?></cite></figcaption>
</figure>
<div class="tri-col feature-callouts">
    <div>
        <img src="/assets/images/real-experience-icon.svg" alt="">
        <h2 class="alt">Real Experience</h2>
        <p>Test your user’s real experience with global locations, modern devices, and the latest browser versions.</p>
    </div>
    <div>
        <img src="/assets/images/video-capture-icon.svg" alt="">
        <h2 class="alt">Video Capture</h2>
        <p>Correlate your user’s visual experience to the technical measurements of your site.</p>
    </div>
    <div>
        <img src="/assets/images/indepth-metrics-icon.svg" alt="">
        <h2 class="alt">In-Depth Metrics</h2>
        <p>Dive into the anatomy of your webpage with components like DNS, TCP, TLS, and more.</p>
    </div>
</div>