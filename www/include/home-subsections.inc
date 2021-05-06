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
<?php
$quotes = array(
    array('quote' => 'The best professional web performance investigators I know use WPT as a critical part of their workflows, and it\'s the center of mine.',
          'author' => 'Alex Russell, Software Engineer, Google Chrome'),
    array('quote' => 'One of the cool features of WebPageTest is that it can generate a filmstrip of screen snapshots taken during a web page load, enabling us to quantify how a page loads, visually. This view makes it significantly easier to determine how long the page is blank for, and how long it takes for the most important content to render.</p><p>Being able to look at the results in this way, provides the ability to empathise with the user.',
          'author' => 'Andrew Galloni, Engineering Director at Cloudflare'),
    array('quote' => 'WebPage Test measures web performance metrics in real browsers, is highly programmable, and could scale to test millions of sites per day.',
          'author' => 'Yevgen Safranov, Software Engineer at Cloudflare'),
    array('quote' => 'Snyk uses WebPageTest to perform 3rd party library detection and vulnerability scanning that reveals potential security vulnerabilities in your website pages.',
          'author' => 'Liran Tal, Developer Relations at Snyk'),
);
$quote = $quotes[array_rand($quotes)];
?>
<figure class="testimonial">
    <blockquote>
        <p>“<?php echo $quote['quote']; ?>”</p>
    </blockquote>
    <figcaption><cite><?php echo $quote['author']; ?></cite></figcaption>
</figure>
<h2 class="light">Featured Content</h2>
<div class="tri-col">
    <div class="resource-block">
        <a href="https://blog.webpagetest.org/posts/why-first-contentful-paint-doesnt-work-as-a-cross-browser-metric/">
            <img src="/images/tiles/FCP.png" alt="">
            <h3>Why First Contentful Paint Doesn't Work As a Cross-Browser Metric</h3>
            <p>Learn why First Contentful Paint isn't exactly apples-to-apples from one browser to the next</p>
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
        <a href="https://blog.webpagetest.org/posts/extending-webpagetest-with-custom-metrics/">
            <img src="/images/tiles/CustomMetrics.png" alt="">
            <h3>Extending WebPageTest With Custom Metrics</h3>
            <p>Check out a few examples of powerful custom metrics you can pull from WebPageTest</p>
        </a>
    </div>
</div>
<?php
if (is_file('tmp/feeds.dat')) {
    $feeds = json_decode(file_get_contents('tmp/feeds.dat'), true);
    if ($feeds) {
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
    }
}
?>