
<?php
$quotes = array(
    array('quote' => '<a href="https://product.webpagetest.org/experiments">Experiments</a> are a game changer for quantifying the speed impact of performance optimizations. What took days of technical work is now just a few clicks. Not only will this save tons of time, it will let us test and iterate ideas to find the right mix of recommendations efficiently.<br><b>I’m blown away this exists, it feels like magic.</b>',
          'author' => 'Todd Parker <span>Partner, Filament Group</span>'),
    /*array('quote' => 'The best professional web performance investigators I know use WPT as a critical part of their workflows, and it\'s the center of mine.',
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
<figure class="testimonial">
    <blockquote>
        <p>“<?php echo $quote['quote']; ?>”</p>
    </blockquote>
    <figcaption><cite><?php echo $quote['author']; ?></cite></figcaption>
</figure>
<div class="tri-col feature-callouts">
    <div>
        <img src="/images/real-experience-icon.svg" alt="">
        <h2 class="alt">Real Experience</h2>
        <p>Test your user’s real experience with global locations, modern devices, and the latest browser versions.</p>
    </div>
    <div>
        <img src="/images/video-capture-icon.svg" alt="">
        <h2 class="alt">Video Capture</h2>
        <p>Correlate your user’s visual experience to the technical measurements of your site.</p>
    </div>
    <div>
        <img src="/images/indepth-metrics-icon.svg" alt="">
        <h2 class="alt">In-Depth Metrics</h2>
        <p>Dive into the anatomy of your webpage with components like DNS, TCP, TLS, and more.</p>
    </div>
</div>
<h2 class="light">What's new on the WebPageTest Blog</h2>
<div class="tri-col">
    <div class="resource-block">
        <a href="https://blog.webpagetest.org/posts/full-throttle-comparing-packet-level-and-dev-tools-throttling/">
            <img src="/images/tiles/blog-throttling.png" alt="">
            <h3>Full Throttle: Comparing packet-level and DevTools throttling</h3>
            <p>Learn why packet-level throttling is better than DevTools throttling and the gold standard in accuracy for WebPerf measurements.</p>
        </a>
    </div>
    <div class="resource-block">
        <a href="https://css-tricks.com/webpagetest-api/">
            <img src="/images/tiles/CSS.png" alt="">
            <h3>WebPageTest API Review on CSS Tricks</h3>
            <p>Chris Coyier takes the API out for a spin and shares where he sees the most promise for developers</p>
        </a>
    </div>
    <div class="resource-block">
        <a href="https://blog.webpagetest.org/posts/new-render-blocking-indicator-in-chrome-and-webpagetest/">
            <img src="/images/tiles/blog-renderblock.png" alt="">
            <h3>New Render Blocking Indicator in Chrome and WebPageTest</h3>
            <p>How to use WebPageTest's render-blocking indicator to improve on one of the most common performance bottlenecks.</p>
        </a>
    </div>
</div>
<?php
if (is_file('tmp/feeds.dat')) {
    $feeds = json_decode(file_get_contents('tmp/feeds.dat'), true);
    if ($feeds) {
        echo '<div class="feedcontain">';
        foreach ($feeds as $category => $items) {
            if (count($items)) {
                rsort($items);
                echo '<div class="feed">';
                echo "<h2 class=\"light\">$category</h2>";
                echo '<ul>';
                $count = 0;
                foreach ($items as $item) {
                    $count++;
                    if ($count > 5)
                        break;
                    if (isset($item['title']) && isset($item['link'])) {
                        echo '<li>';
                        echo "<a href=\"{$item['link']}\" title=\"{$item['source']}\" rel=\"nofollow\">";
                        echo htmlspecialchars($item['title']);
                        echo '</a></li>';
                    }
                }
                echo '</ul></div>';
            }
        }
        echo '</div>';
    }
}
?>
