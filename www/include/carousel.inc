<style>
    .container {
        height: 450px;
        margin-bottom: 5rem;
    }

    .logos-section-wrapper {
        height: 100%;
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        background-color: #f9f9f9;
        overflow: hidden;
        margin: -1px 0;
    }

    .track-horizontal {
        z-index: 1;
        flex: none;
        align-items: center;
        display: flex;
    }

    .logos-track {
        flex: none;
        align-items: center;
        display: flex;
    }

    .carousel-logo {
        width: 8rem;
        height: auto;
        flex: none;
        margin-right: 7vw;
    }

    img {

        &.carousel-logo {
            max-width: 100%;
            vertical-align: middle;
            display: inline-block;
        }

    }

    .carousel-logo.is-smaller {
        width: 6rem;
    }

    .carousel-logo.is-larger {
        width: 12rem;
    }

    .carousel-logo.gap-logo {
        width: 5rem;
    }

    .carousel-logo.salesforce {
        width: 6rem;
    }

    .carousel-logo.fedex {
        width: 7rem;
    }

    .carousel-logo.is-mckinsey {
        width: 7.5rem;
    }

    .logo-carousel-heading {
        z-index: 2;
        text-align: center;
        color: initial;
        font-family: Lato, sans-serif;
        font-size: 2rem;
        font-weight: bold;
        position: relative;
        margin-left: auto;
        margin-right: auto;
        margin-top: 3.5rem;
    }

    .track-horizontal {
        padding-top: 10rem;
        position: absolute;
        white-space: nowrap;
        will-change: transform;
        animation: marquee-horizontal 30s linear infinite;
    }

    .absolute-carousel-container {
        height: 450px;
        padding-top: 0;
        padding-left: 0;
        padding-right: 0;
        position: relative;
        overflow: hidden;
        position: absolute;
        left: 0;
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        background-repeat: no-repeat;
        background-size: contain;

        >img.top-wave {
            width: 100%;
            height: 60px;
        }

        >img.bottom-wave {
            width: 100%;
            height: 30px;
        }
    }

    @keyframes marquee-horizontal {
        from {
            transform: translateX(0);
        }

        to {
            transform: translateX(-50%);
        }
    }

    @media (max-width: 33em) {
        .logo-carousel-heading {
            font-size: 1.675em;
            font-weight: 500;
            margin-top: 3em;
        }
    }
</style>
<?php
$quotes = array(
    array(
        'quote' => 'The best professional web performance investigators I know use WPT as a critical part of theyr workflows, and it\'s the center or mine.',
        'author' => 'Alex Russel <span>Program Manager, Microsoft Edge</span>'
    ),
);
$quote = $quotes[array_rand($quotes)];
?>

<div class="container">
    <div class="absolute-carousel-container">
        <img src="/assets/images/carousel/top-wave.png" loading="lazy" class="top-wave">
        <div class="logos-section-wrapper">
            <div class="logo-carousel-heading">Trusted by the world's top brands</div>
            <div class="track-horizontal">
                <div class="logos-track">
                    <img src="/assets/images/carousel/ikea.svg" loading="lazy" alt="" class="carousel-logo">
                    <img src="/assets/images/carousel/google.svg" loading="lazy" alt="" class="carousel-logo">
                    <img src="/assets/images/carousel/oracle.svg" loading="lazy" alt="" class="carousel-logo is-smaller">
                    <img src="/assets/images/carousel/stripe.svg" loading="lazy" alt="" class="carousel-logo">
                    <img src="/assets/images/carousel/shopify.svg" loading="lazy" alt="" class="carousel-logo">
                    <img src="/assets/images/carousel/hubSpot.svg" loading="lazy" alt="" class="carousel-logo is-smaller">
                    <img src="/assets/images/carousel/fedEx.svg" loading="lazy" alt="" class="carousel-logo fedex">
                    <img src="/assets/images/carousel/mcKinsey.svg" loading="lazy" alt="" class="carousel-logo is-mckinse">
                    <img src="/assets/images/carousel/belkin.svg" loading="lazy" alt="" class="carousel-logo">
                    <img src="/assets/images/carousel/salesforce.svg" loading="lazy" alt="" class="carousel-logo salesforce">
                    <img src="/assets/images/carousel/dynatrace.svg" loading="lazy" alt="" class="carousel-logo">
                    <img src="/assets/images/carousel/chanel.svg" loading="lazy" alt="" class="carousel-logo">
                    <img src="/assets/images/carousel/netlify.svg" loading="lazy" alt="" class="carousel-logo">
                    <img src="/assets/images/carousel/GAP.svg" loading="lazy" alt="" class="carousel-logo gap-logo">
                    <img src="/assets/images/carousel/urbanOutfitters.svg" loading="lazy" alt="" class="carousel-logo">
                    <img src="/assets/images/carousel/canva.svg" loading="lazy" alt="" class="carousel-logo">
                </div>
                <div class="logos-track">
                    <img src="/assets/images/carousel/ikea.svg" loading="lazy" alt="" class="carousel-logo">
                    <img src="/assets/images/carousel/google.svg" loading="lazy" alt="" class="carousel-logo">
                    <img src="/assets/images/carousel/oracle.svg" loading="lazy" alt="" class="carousel-logo is-smaller">
                    <img src="/assets/images/carousel/stripe.svg" loading="lazy" alt="" class="carousel-logo">
                    <img src="/assets/images/carousel/shopify.svg" loading="lazy" alt="" class="carousel-logo">
                    <img src="/assets/images/carousel/hubSpot.svg" loading="lazy" alt="" class="carousel-logo is-smaller">
                    <img src="/assets/images/carousel/fedEx.svg" loading="lazy" alt="" class="carousel-logo fedex">
                    <img src="/assets/images/carousel/mcKinsey.svg" loading="lazy" alt="" class="carousel-logo is-mckinse">
                    <img src="/assets/images/carousel/belkin.svg" loading="lazy" alt="" class="carousel-logo">
                    <img src="/assets/images/carousel/salesforce.svg" loading="lazy" alt="" class="carousel-logo salesforce">
                    <img src="/assets/images/carousel/dynatrace.svg" loading="lazy" alt="" class="carousel-logo">
                    <img src="/assets/images/carousel/chanel.svg" loading="lazy" alt="" class="carousel-logo">
                    <img src="/assets/images/carousel/netlify.svg" loading="lazy" alt="" class="carousel-logo">
                    <img src="/assets/images/carousel/GAP.svg" loading="lazy" alt="" class="carousel-logo gap-logo">
                    <img src="/assets/images/carousel/urbanOutfitters.svg" loading="lazy" alt="" class="carousel-logo">
                    <img src="/assets/images/carousel/canva.svg" loading="lazy" alt="" class="carousel-logo">
                </div>
            </div>
        </div>
        <img src="/assets/images/carousel/bottom-wave.png" loading="lazy" class="bottom-wave">
    </div>
</div>
<figure class="testimonial">
    <blockquote>
        <p>“<?php echo $quote['quote']; ?>”</p>
    </blockquote>
    <figcaption><cite><?php echo $quote['author']; ?></cite></figcaption>
</figure>