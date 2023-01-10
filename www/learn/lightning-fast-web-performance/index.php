<!DOCTYPE html>
<html class="account-layout">

<head>
    <title>Lightning-Fast Web Performance Online Course from WebPageTest</title>
    <?php

        require_once __DIR__ . '/../../common.inc';

        $socialTitle = 'Lightning-Fast Web Performance Online Course from WebPageTest';
        $useScreenshot = true;
        require_once INCLUDES_PATH . '/head.inc';
    ?>
    <link rel="stylesheet" href="/learn/lightning-fast-web-performance/lfwp-assets/learn-course.css">
</head>

<body class="learn">

    <?php
     $tab = 'Resources';
     require_once WWW_PATH . '/templates/layouts/includes/wpt-header.php';



     $loginLink = <<<EOT

	 <p>To view the rest of videos in this course, you'll need a WebPageTest account. <strong>It's free!</strong></p>
	 <div class="experiment_description_go">
	 <a href="/signup?redirect_uri=/learn/lightning-fast-web-performance" style="background: #0e70b9;min-width: auto;margin-right: .5em;"><span style="color: #fff !important;">Sign Up</span> </a>
	 <em style="margin-right: .5em;">or...</em>
	 <a href="/login?redirect_uri=/learn/lightning-fast-web-performance" style="min-width: auto;"><span>Log In</span> </a>
	 </div>
EOT;

    $lockedIcon = '';
    if ($experiments_logged_in === false) {
        $lockedIcon = '<i class="lfwp_icon_locked"></i>';
    }

    ?>






<div class="learn_feature">
    <div class="learn_feature_hed_contain">


                <div class="learn_feature_hed learn_feature_hed-pro">
                    <div class="learn_feature_hed_text">
                        <h1 class="attention"><span class="learn_feature_hed_text_leadin">Lightning-Fast </span> Web Performance</h1>
                        <p><b class="flag">Online Course</b>Learn to analyze site performance, fix issues, monitor for regressions, and deliver fast, responsive designs from the start.</p>
                    </div>
                    <div class="learn_feature_hed_visual">
                        <p><img src="/learn/lightning-fast-web-performance/lfwp-assets/lfwp-profile-sj.png" alt="Profile Picture of Scott">
                        <span>An online lecture course <em>led by Scott Jehl, WebPageTest</em>
                            <a href="#toc" class="pill">Free! Start Now</a>
                        </span>
                    </p>
                    </div>
                </div>

    </div>


</div>


    <div class="learn_content_contain">
    <div class="learn_content">


    <section class="course_intro">
        <section class="video_intro">
        <h2>Quick Course Intro</h2>
        <div class="video">
        <iframe src="https://player.vimeo.com/video/735047569?h=9f45d3647f&amp;badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;" title="Course Intro"></iframe>
        </div>
        </section>
    <section class="whatyoulllearn">
                <h2>What You’ll Learn</h2>
                <p>In this lecture series, you'll gain a well-rounded understanding of front-end web performance that'll empower you to deliver sites quickly and reliably. </p>
                <ul>
                    <li><div>You’ll learn how to effectively think about and prioritize web performance today.</div></li>
                    <li><div>You’ll learn about common performance metrics, which ones matter most, and how to identify performance bottlenecks that impact the user experience.</div></li>
                    <li><div>You’ll learn how to fix performance issues, employ processes to prevent regressions, and build in ways that prevent problems from occurring in the first place.</div></li>
                </ul>
            </section>
</section>

<section class="fullerinfo">
                <div class="fullerinfo_contain">

                    <div class="topicscovered">
                        <h2>Topics Covered</h2>
                        <ul>
                            <li>Convincing stakeholders to prioritize performance</li>
                            <li>Measuring and benchmarking perceived performance</li>
                            <li>Understanding the web page loading process</li>
                            <li>Identifying server-level performance hangups</li>
                            <li>Knowing how and when file size matters</li>
                            <li>Evaluating patterns for loading CSS, JavaScript, Images, SVG, and Fonts</li>
                            <li>Optimizing the critical path to perceived performance</li>
                            <li>Helpful Tools and libraries</li>
                            <li>HTTP/2 and its helpful additions</li>
                            <li>Content Delivery Networks and edge cache transformations</li>
                            <li>Enhancing a user interface optimistically, yet safely</li>
                            <li>Client-side caching strategies</li>
                            <li>Retaining performance after page load</li>
                            <li>Service Workers for spotty or offline connectivity</li>
                            <li>Monitoring, maintaining, and defending a fast site as it evolves</li>
                            <li>Making existing sites faster and more resilient</li>
                        </ul>
                    </div>

                </div>
            </section>



<section class="see-ahead">
                <h2>See what you'll get</h2>
                <p>These clips are taken from various points throughout the lecture series and illustrate the style of presentation you can expect to see throughout.</p>
                <div class="see-ahead-vids">

                    <figure>
                    <iframe src="https://player.vimeo.com/video/740436486?h=25de43764b&amp;badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;" title="3-preview"></iframe>
                        <figcaption><p>...from 3. Metrics</p></figcaption>
                    </figure>
                    <figure>
                    <iframe src="https://player.vimeo.com/video/740436611?h=5ec1db93b2&amp;badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;" title="2 - preview"></iframe>
                        <figcaption><p>...from 2. Why Performance Matters</p></figcaption>
                    </figure>
                    <figure>
                        <iframe src="https://player.vimeo.com/video/740436639?h=c59a5f77bc&amp;badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;" title="4- preview"></iframe>
                        <figcaption><p>...from 4. Identifying Problems</p></figcaption>
                    </figure>
                    <figure>
                    <iframe src="https://player.vimeo.com/video/740436533?h=a48e094ef9&amp;badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;" title="5 - preview"></iframe>
                        <figcaption><p>...from 5. Making Things Faster</p></figcaption>
                    </figure>
                </div>
            </section>


            <section class="fullerinfo fullerinfo-forme">
            <div class="isthisforme">
                        <h2>Is This For Me?</h2>
                        <p>This lecture series is designed to cover performance holistically, starting with the basics and continuing to touch on points both technical and not. The course does not assume any knowledge of performance concepts, but it is aimed at Front-End Developers and UI/UX designers who are comfortable writing HTML, CSS, and have a basic knowledge of JavaScript.</p>
                        <p>If you're a designer or developer looking to gain a better understanding of how your decisions and company culture impacts your ability to deliver quickly and resiliently, this is the course for you.</p>
                    </div>

                    <div class="start_cta">
                        <p>Start watching the course and see. <strong>It's free!</strong></p>
                        <a href="#toc" class="pill">Start Now</a>
                    </div>
            </section>



            <section class="curric" >
                <h2 id="toc">Start The Course!</h2>
                <p>This free course consists of a series of video lectures that combine screencasts and narrated slides. Closed captioning is provided and a PDF is included with each video for links to resources mentioned within. Some videos require signing up for a free WebPageTest account.</p>
                <ol>
                    <li>
                        <details open>
                            <summary><span>Welcome <em>(02:26 mins)</em></span></summary>
                            <div class="chapter_inner">
                            <div class="video">
                                <iframe src="https://player.vimeo.com/video/731483782?h=3211b59c91&amp;badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;" title="1 Welcome"></iframe>
                            </div>

                            <div class="chapter_extra">
                                <p>An introduction to the course and and overview of how you can expect the subject matter to be divided up.</p>
                                <h3>Additional Section Content</h3>
                                <ul>
                                <li><a href="/learn/lightning-fast-web-performance/lfwp-assets/1-welcome.pdf">PDF slides/links</a></li>

                                </ul>
                            </div>
                            </div>
                        </details>
                    </li>

                    <li><details><summary><span><?php echo $lockedIcon; ?>Why Performance Matters <em>(15:47 mins)</em></span></summary>
                    <div class="chapter_inner">
                            <div class="video">
                                    <?php if ($experiments_logged_in) { ?>
                                        <iframe src="https://player.vimeo.com/video/735086470?h=6f458953d3&amp;badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;" title="2 - why performance matters"></iframe>
                                    <?php } else { ?>
                                        <img src="https://videoapi-muybridge.vimeocdn.com/animated-thumbnails/image/9ab9d1c4-5e4e-4bba-b390-1c2ce8904378.gif?ClientID=vimeo-core-prod&Date=1660752279&Signature=51c7238bc6a43a724eb9b64f0d8827ccbbe59979" alt="GIF screenshot of video first frames">
                                    <?php } ?>
                                </div>

                                <div class="chapter_extra">
                                    <p>An top-down look at how performance impacts user experience and other concerns on the web today.</p>
                                <?php if ($experiments_logged_in) { ?>
                                    <h3>Additional Section Content</h3>
                                    <ul>
                                    <li><a href="/learn/lightning-fast-web-performance/lfwp-assets/2-why-performance-matters.pdf">PDF slides/links</a></li>

                                    </ul>
                                <?php } else {
                                        echo $loginLink;
                                } ?>
                                </div>
                        </div>
                </details></li>
                    <li><details><summary><span><?php echo $lockedIcon; ?>Metrics! How do we define fast? <em>(24:36 mins)</em></span></summary>
                    <div class="chapter_inner">
                            <div class="video">
                                    <?php if ($experiments_logged_in) { ?>
                                        <iframe src="https://player.vimeo.com/video/737696316?h=d3956d8914&amp;badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;" title="3 - metrics"></iframe>
                                    <?php } else { ?>
                                        <img src="https://videoapi-muybridge.vimeocdn.com/animated-thumbnails/image/f2fbfd36-8900-4ba4-9f74-586cedc937fb.gif?ClientID=vimeo-core-prod&Date=1660752303&Signature=0c1df0449f06fdda03d6172e01f8d755ff7b652e" alt="GIF screenshot of video first frames">
                                    <?php } ?>
                                </div>

                                <div class="chapter_extra">
                                    <p>A tour of the common metrics that performance tools and web developers use to measure and compare webpage performance and usability.</p>
                                <?php if ($experiments_logged_in) { ?>
                                    <h3>Additional Section Content</h3>
                                    <ul>
                                    <li><a href="/learn/lightning-fast-web-performance/lfwp-assets/3-metrics-.pdf">PDF slides/links</a></li>

                                    </ul>
                                <?php } else {
                                        echo $loginLink;
                                } ?>
                                </div>
                        </div>
                </details></li>
                    <li><details><summary><span><?php echo $lockedIcon; ?>Identifying Performance Problems <em>(49:37 mins)</em></span></summary>
                    <div class="chapter_inner">
                            <div class="video">
                                    <?php if ($experiments_logged_in) { ?>
                                        <iframe src="https://player.vimeo.com/video/738266200?h=11d85bfc8e&amp;badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;" title="4 identifying problems.mp4"></iframe>
                                    <?php } else { ?>
                                        <img src="https://videoapi-muybridge.vimeocdn.com/animated-thumbnails/image/9ef091ae-3f78-4d7f-b61a-b7c4f97dcca9.gif?ClientID=vimeo-core-prod&Date=1660752323&Signature=5156cf71be3ddf381a4e73c83c506aa6d7b2ccfd" alt="GIF screenshot of video first frames">
                                    <?php } ?>
                                </div>

                                <div class="chapter_extra">
                                    <p>A deep dive into the process of using popular performance tools to find and diagnose issues with webpage performance.</p>
                                <?php if ($experiments_logged_in) { ?>
                                    <h3>Additional Section Content</h3>
                                    <ul>
                                    <li><a href="/learn/lightning-fast-web-performance/lfwp-assets/4-identifying-problems.pdf">PDF slides/links</a></li>

                                    </ul>
                                <?php } else {
                                        echo $loginLink;
                                } ?>
                                </div>
                        </div>
                    </details></li>
                    <li>Making Things Faster
                        <ol>
                            <li><details><summary><span><?php echo $lockedIcon; ?> Optimizing Files <em>(27:25 mins)</em></span></summary>
                                    <div class="chapter_inner">
                                        <div class="video">
                                                <?php if ($experiments_logged_in) { ?>
                                                    <iframe src="https://player.vimeo.com/video/738266745?h=a9a46dc197&amp;badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;" title="5.1 - making things faster- optimizing files.mp4"></iframe>
                                                <?php } else { ?>
                                                    <img src="https://videoapi-muybridge.vimeocdn.com/animated-thumbnails/image/62e1ab07-6dbf-483d-81b4-c4b17aae4552.gif?ClientID=vimeo-core-prod&Date=1660752258&Signature=0cfa01357e7976006c4f328401dae70714a5bccf" alt="GIF screenshot of video first frames">
                                                <?php } ?>
                                            </div>

                                            <div class="chapter_extra">
                                                <p>Optimizing files is one of the easiest and most impactful ways to improve your site's ability to perform.</p>
                                            <?php if ($experiments_logged_in) { ?>
                                                <h3>Additional Section Content</h3>
                                                <ul>
                                                <li><a href="/learn/lightning-fast-web-performance/lfwp-assets/5.1-making-things-faster-optimizing-files.pdf">PDF slides/links</a></li>

                                                </ul>
                                            <?php } else {
                                                    echo $loginLink;
                                            } ?>
                                            </div>
                                    </div>
                                </details></li>
                            <li><details><summary><span><?php echo $lockedIcon; ?>Initial bytes <em>(09:42 mins)</em></span></summary>
                                    <div class="chapter_inner">
                                        <div class="video">
                                                <?php if ($experiments_logged_in) { ?>
                                                    <iframe src="https://player.vimeo.com/video/735195917?h=19d878bb1e&amp;badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;" title="5.2 - Making things faster - first byte"></iframe>
                                                <?php } else { ?>
                                                    <img src="https://videoapi-muybridge.vimeocdn.com/animated-thumbnails/image/38536d20-5105-4af6-9c3e-fd5a565648ae.gif?ClientID=vimeo-core-prod&Date=1660752361&Signature=2c05446e542e4c2470174b8aa2073af7a3db2f35" alt="GIF screenshot of video first frames">
                                                <?php } ?>
                                            </div>

                                            <div class="chapter_extra">
                                            <p>Learn about the fundamentals of initial page delivery and what can cause it to be slow.</p>

                                            <?php if ($experiments_logged_in) { ?>
                                                <h3>Additional Section Content</h3>
                                                <ul>
                                                <li><a href="/learn/lightning-fast-web-performance/lfwp-assets/5.2-making-things-faster-first-byte.pdf">PDF slides/links</a></li>

                                                </ul>
                                            <?php } else {
                                                    echo $loginLink;
                                            } ?>
                                            </div>
                                    </div>
                                </details></li>
                            <li><details><summary><span><?php echo $lockedIcon; ?>Initial Paints <em>(26:59 mins)</em></span></summary>
                                    <div class="chapter_inner">
                                        <div class="video">
                                                <?php if ($experiments_logged_in) { ?>
                                                    <iframe src="https://player.vimeo.com/video/740106632?h=1aedfd7975&amp;badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;" title="5.3 - making things faster- first paints"></iframe>
                                                <?php } else { ?>
                                                    <img src="https://videoapi-muybridge.vimeocdn.com/animated-thumbnails/image/7c9649dc-7953-4e13-b93c-f3ca07583f0d.gif?ClientID=vimeo-core-prod&Date=1660752480&Signature=a8d12f5ab0035f53d2e60ad3ddb2f616c638ee52" alt="GIF screenshot of video first frames">
                                                <?php } ?>
                                            </div>

                                            <div class="chapter_extra">
                                                <p>Explore the bottlenecks between initial bytes and initial page rendering and how to streamline them.</p>
                                            <?php if ($experiments_logged_in) { ?>
                                                <h3>Additional Section Content</h3>
                                                <ul>
                                                <li><a href="/learn/lightning-fast-web-performance/lfwp-assets/5.3-making-things-faster-first-paints.pdf">PDF slides/links</a></li>

                                                </ul>
                                            <?php } else {
                                                    echo $loginLink;
                                            } ?>
                                            </div>
                                    </div>
                                </details></li>
                            <li><details><summary><span><?php echo $lockedIcon; ?>LCP and Meaningful Paints <em>(44:04 mins)</em></span></summary>
                                    <div class="chapter_inner">
                                        <div class="video">
                                                <?php if ($experiments_logged_in) { ?>
                                                    <iframe src="https://player.vimeo.com/video/740185219?h=90642daa31&amp;badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;" title="5.4 - making things faster - meaningful paint"></iframe>

                                                <?php } else { ?>
                                                    <img src="https://videoapi-muybridge.vimeocdn.com/animated-thumbnails/image/aef9d16e-8bb6-40a3-86f4-caeca8dca32a.gif?ClientID=vimeo-core-prod&Date=1660752562&Signature=28c1085f4d6ca8b04f37dec67a0f654f8f542daa" alt="GIF screenshot of video first frames">
                                                <?php } ?>
                                            </div>

                                            <div class="chapter_extra">
                                                <p>A look at the conditions that contribute to large contentful paints and how to speed them up.</p>
                                            <?php if ($experiments_logged_in) { ?>
                                                <h3>Additional Section Content</h3>
                                                <ul>
                                                <li><a href="/learn/lightning-fast-web-performance/lfwp-assets/5.4-making-things-faster-meaningful-paint.pdf">PDF slides/links</a></li>

                                                </ul>
                                            <?php } else {
                                                    echo $loginLink;
                                            } ?>
                                            </div>
                                    </div>
                                </details></li>
                            <li><details><summary><span><?php echo $lockedIcon; ?>Getting Interactive <em>(14:32 mins)</em></span></summary>
                                    <div class="chapter_inner">
                                        <div class="video">
                                                <?php if ($experiments_logged_in) { ?>
                                                    <iframe src="https://player.vimeo.com/video/735196308?h=449f68bab3&amp;badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;" title="5.5 - making things faster - getting interactive"></iframe>
                                                <?php } else { ?>
                                                    <img src="https://videoapi-muybridge.vimeocdn.com/animated-thumbnails/image/0623f5bc-422d-419c-8ff9-3bd2a18068fa.gif?ClientID=vimeo-core-prod&Date=1660752774&Signature=e6e0c91b196ab1f8bdac61329bc91f990d609598" alt="GIF screenshot of video first frames">
                                                <?php } ?>
                                            </div>

                                            <div class="chapter_extra">
                                                <p>A look at the delays between when a page looks usable and actually responds to user interaction and how to mitigate them. </p>
                                            <?php if ($experiments_logged_in) { ?>
                                                <h3>Additional Section Content</h3>
                                                <ul>
                                                <li><a href="/learn/lightning-fast-web-performance/lfwp-assets/5.5-making-things-faster-getting-interactive.pdf">PDF slides/links</a></li>

                                                </ul>
                                            <?php } else {
                                                    echo $loginLink;
                                            } ?>
                                            </div>
                                    </div>
                                </details></li>
                            <li><details><summary><span><?php echo $lockedIcon; ?> for Returning Visits <em>(21:30 mins)</em></span></summary>
                                    <div class="chapter_inner">
                                        <div class="video">
                                                <?php if ($experiments_logged_in) { ?>
                                                    <iframe src="https://player.vimeo.com/video/740359110?h=0992b94d4b&amp;badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;" title="5.6 - making things faster- returning visits"></iframe>
                                                <?php } else { ?>
                                                    <img src="https://videoapi-muybridge.vimeocdn.com/animated-thumbnails/image/647c92d4-5719-4838-abd1-ffe28e45a5a9.gif?ClientID=vimeo-core-prod&Date=1660752661&Signature=d3accb62c5aac89cf63b18e698b4908132b6e710" alt="GIF screenshot of video first frames">
                                                <?php } ?>
                                            </div>

                                            <div class="chapter_extra">
                                                <p>Good performance considers the holistic user experience, and many optimizations can make recurring visits faster and more resilient. </p>
                                            <?php if ($experiments_logged_in) { ?>
                                                <h3>Additional Section Content</h3>
                                                <ul>
                                                <li><a href="/learn/lightning-fast-web-performance/lfwp-assets/5.6-making-things-faster-returning-visits.pdf">PDF slides/links</a></li>

                                                </ul>
                                            <?php } else {
                                                    echo $loginLink;
                                            } ?>
                                            </div>
                                    </div>
                                </details></li>
                        </ol>
                    </li>
                    <li><details><summary><span><?php echo $lockedIcon; ?>Wrapping up <em>(01:52 mins)</em></span></summary>
                                    <div class="chapter_inner">
                                        <div class="video">
                                                <?php if ($experiments_logged_in) { ?>
                                                    <iframe src="https://player.vimeo.com/video/735197703?h=b043964e1f&amp;badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;" title="6 wrapping up"></iframe>
                                                <?php } else { ?>
                                                    <img src="https://videoapi-muybridge.vimeocdn.com/animated-thumbnails/image/8560ae23-74f1-46c5-ac93-86032268b575.gif?ClientID=vimeo-core-prod&Date=1660752692&Signature=04e0bac0c8bb4ad1ef551f167fa99c4c6cf68772" alt="GIF screenshot of video first frames">
                                                <?php } ?>
                                            </div>

                                            <div class="chapter_extra">
                                                <p>A look back through all that we've covered.</p>
                                            <?php if ($experiments_logged_in) { ?>
                                                <h3>Additional Section Content</h3>
                                                <ul>
                                                <li><a href="/learn/lightning-fast-web-performance/lfwp-assets/6-wrapping-up.pdf">PDF slides/links</a></li>

                                                </ul>
                                            <?php } else {
                                                    echo $loginLink;
                                            } ?>
                                            </div>
                                    </div>
                        </details></li>
                        <?php if ($experiments_logged_in) {
                            $thisUser = $request_context->getUser();
                            $name = $thisUser->getFirstName() . " " . $thisUser->getLastName();
                            $CertimgURL = "https://wpt-screenshot.netlify.app/" . rawurlencode("https://www.webpagetest.org/learn/lightning-fast-web-performance/certificate.php?name=" . $name . "&screenshot=1") . "/opengraph/20220913";
                            ?>
                        <li class="cert-li"><details><summary><span>Certificate of Completion</span></summary>
                                    <div class="chapter_inner">
                                        <div class="video video-cert">
                                                <img src="<?=$CertimgURL?>" loading="lazy" alt="Certificate image acknowledging completion">
                                            </div>

                                            <div class="chapter_extra">

                                                <h3>Your Certificate</h3>
                                                <p>Congratulations on completing the course. Use this certificate to share your achievement!</p>
                                                <ul>
                                                <li><a href="<?=$CertimgURL?>" download>Download Image</a></li>
                                                </ul>

                                            </div>
                                    </div>
                        </details></li>
                        <?php } ?>

                </ol>
            </section>

            <section class="about">
                <h3>About Your Host</h3>
                <p>Scott Jehl, author of <a href="https://abookapart.com/products/responsible-responsive-design"> Responsible Responsive Design</a></p>
                <div class="bio">
                    <div class="img">
                        <img src="/learn/lightning-fast-web-performance/lfwp-assets/lfwp-profile-sj.png" alt="headshot of Scott">
                    </div>
                    <div class="bio_text">
                        <p>Scott Jehl is a Senior Experience Engineer at <a href="https://www.webpagetest.org">WebPageTest</a> (by <a href="https://www.catchpoint.com">Catchpoint</a>) who lives in New York City. Scott is a tireless advocate of practices that ensure web access for all. He is a frequent presenter at conferences throughout the world.</p>
                        <p>Scott is the author of <a href="https://abookapart.com/products/responsible-responsive-design">Responsible Responsive Design</a> (2014, A Book Apart), and co-author of Designing with Progressive Enhancement (2010, New Riders). Scott also loves to surf.</p>
                    </div>
                    <div class="bio_else">
                        <h4>Find Scott</h4>
                        <p>Questions about the course? Please reach out!</p>
                        <ul>
                            <li><a href="https://twitter.com/realwebpagetest">twitter/@realwebpagetest</a></li>
                            <li><a href="mailto:contact@webpagetest.org">Email</a></li>
                        </ul>
                    </div>
                </div>
            </section>


    </div>
    </div>

    <?php require_once INCLUDES_PATH . '/footer.inc'; ?>

</body>
<script>
            (function(){
                var intro = document.querySelector(".video video");
                var playbtn = document.querySelector(".play");

                function activate(){
                    intro.controls = true;
                    document.body.classList.add("playing");
                }
                function deactivate(){
                    intro.controls = false;
                    intro.pause();
                    document.body.classList.remove("playing");
                }

                intro.addEventListener( "play", function(e){
                    activate();
                    playbtn.classList.add("active");
                });
                intro.addEventListener( "pause", function(e){
                    playbtn.classList.remove("active");
                });
                intro.addEventListener( "ended", function(e){
                    this.controls = false;
                    deactivate();
                    document.body.classList.remove("playing");
                });
                playbtn.addEventListener( "click", function(e){
                    e.preventDefault();
                    if(intro.paused){
                        intro.play();
                    } else {
                        intro.pause();
                    }
                });

                document.body.addEventListener("mousedown",function( e ){
                    if( this.classList.contains("playing") && e.target !== intro && e.target !== playbtn  ){
                        e.preventDefault();
                        deactivate();
                    }
                });
                document.body.addEventListener("keydown",function( e ){
                    if( this.classList.contains("playing") && e.keyCode === 27 ){
                        e.preventDefault();
                        deactivate();
                    }
                });
            }());
        </script>
        <script src="https://player.vimeo.com/api/player.js"></script>
</html>
