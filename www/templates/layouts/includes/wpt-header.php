<?php

use WebPageTest\Util;

function addTab($tabName, $tabUrl, $addClass = '')
{
    global $tab;
    // make sure we have a test result to navigate to
    if (strlen($tabUrl)) {
        // highlight the current tab
        $target = '';
        $class = '';
        $opens = '';
        $tabindex = '';
        $classes = array();
        if (strlen($addClass)) {
            $classes[] = $addClass;
        }
        if (!strcasecmp($tabName, $tab)) {
            $classes[] = 'wptheader-current';
            $tabindex = ' tabindex="-1"';
        }

        if (count($classes) > 0) {
            $class = ' class="' . implode(' ', $classes) . '"' . $tabindex;
        }

        if (substr($tabUrl, 0, 4) == 'http' && $tabName != 'API') {
            $target = ' target="_blank" rel="noopener"';
            $opens = ' (opens in a new tab)';
        }
        if ($opens != '') {
            return "<li><a$class title=\"$tabName$opens\" href=\"$tabUrl\"$target><span>$tabName</span></a></li>";
        } else {
            return "<li><a$class href=\"$tabUrl\"$target><span>$tabName</span></a></li>";
        }
    }
}

if ($id) {
    $resultUrl = "/results.php?test=$id";
    if (array_key_exists('end', $_REQUEST)) {
        $resultUrl .= "&end={$_REQUEST['end']}";
    } elseif (constant('FRIENDLY_URLS')) {
        $resultUrl = "/result/$id/";
    }
}

// login status
$is_logged_in = Util::getSetting('cp_auth') && (!is_null($request_context->getClient()) && $request_context->getClient()->isAuthenticated());

?>

<wpt-header>
    <cp-header>
        <a href="https://www.catchpoint.com" class="cp-header_logo" aria-label="Catchpoint Home"><svg fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 966 159">
                <path d="M954.52 109.94a5.59 5.59 0 0 1 1.68-4.05 5.85 5.85 0 0 1 4.05-1.68 5.58 5.58 0 0 1 4.05 1.68 5.85 5.85 0 0 1 1.68 4.05 5.59 5.59 0 0 1-1.68 4.05 5.85 5.85 0 0 1-4.05 1.68 5.59 5.59 0 0 1-4.05-1.68 5.85 5.85 0 0 1-1.68-4.05Zm1.57 0a4.54 4.54 0 0 0 1.21 3.07c.38.39.82.7 1.33.93a3.83 3.83 0 0 0 3.24 0 4.15 4.15 0 0 0 2.22-2.31 4.54 4.54 0 0 0-.89-4.76 4.3 4.3 0 0 0-1.33-.93 3.83 3.83 0 0 0-3.24 0 4.15 4.15 0 0 0-2.22 2.31 4.54 4.54 0 0 0-.32 1.69Zm1.96-3.07h2.13l.68.03c.29.02.57.09.85.22.28.12.52.32.72.58.21.26.31.63.31 1.12 0 .31-.04.56-.12.76-.08.2-.19.36-.32.49a1.2 1.2 0 0 1-.45.29c-.17.07-.34.11-.52.13l1.54 2.39h-1.62l-1.37-2.31h-.26v2.31h-1.57v-6.01Zm1.56 2.49h.63l.3-.02c.11-.01.2-.04.3-.08a.6.6 0 0 0 .23-.19c.06-.09.09-.21.09-.36a.64.64 0 0 0-.1-.36.53.53 0 0 0-.22-.19.94.94 0 0 0-.3-.08l-.3-.02h-.63v1.3ZM948.65 46.64V22.63h-20.39v24.01h-8.33V64.7h8.33v51.08h20.39V64.7h9.68V46.64h-9.68ZM889.75 44.92c-5.97 0-11.27 1.87-17.18 6.16v-4.45h-20.39v69.15h20.39V85.34c0-6.17-.01-11.51 2.86-16.08 2.17-3.42 5.48-5.3 9.29-5.3 7.05 0 8.98 4.09 8.98 19.02v32.8h20.39V69.26c.01-14.1-10.23-24.34-24.34-24.34Z" fill="#fff"></path>
                <path d="M830.7 12.09c-6.25 0-11.34 4.89-11.34 10.9 0 6.69 5.09 12.13 11.35 12.13s11.35-5.09 11.35-11.35c0-6.44-5.1-11.68-11.35-11.68Z" fill="#fff"></path>
                <path d="M840.96 46.64h-20.4v69.15h20.4V46.64ZM775.82 44.92c-19.7 0-35.74 16.31-35.74 36.35 0 20.32 15.75 36.23 35.86 36.23 20.45 0 36.47-15.97 36.47-36.35.01-19.98-16.41-36.23-36.59-36.23Zm.25 53.04c-9.25 0-15.47-6.76-15.47-16.81 0-9.67 6.5-16.69 15.47-16.69 9.47 0 15.84 6.76 15.84 16.81-.01 9.83-6.52 16.69-15.84 16.69ZM700.48 44.92a29 29 0 0 0-18.41 6.32v-4.6h-20.39v92.91h20.39v-28.2a28.15 28.15 0 0 0 18.04 6.15c18.6 0 33.16-15.91 33.16-36.23.01-20.72-14.09-36.35-32.79-36.35Zm-3.3 19.05c9.18 0 15.59 7.07 15.59 17.18 0 10.03-6.56 17.31-15.59 17.31-9.32 0-15.84-7.17-15.84-17.43 0-10.21 6.37-17.06 15.84-17.06ZM625.27 44.92c-5.9 0-11.44 1.96-17.18 6.13V21.53h-20.4v94.26h20.4V84.75c-.01-5.93-.03-11.05 2.74-15.36 2.23-3.5 5.53-5.42 9.3-5.42 6.97 0 9.1 4.44 9.1 19.02v32.8h20.39V70.74c-.01-15.68-9.57-25.82-24.35-25.82ZM544.4 63.97c6.08 0 10.23 1.88 14.82 6.71l1.09 1.15 16.96-9.32-1.27-1.86c-6.9-10.14-18.15-15.72-31.71-15.72-22.48 0-38.8 15.34-38.8 36.47 0 20.92 16.2 36.11 38.55 36.11 13.3 0 23.79-4.84 31.15-14.4l1.32-1.72-16.21-11.12-1.2 1.48c-3.57 4.45-8.76 6.71-15.42 6.71-10.57 0-17.67-6.76-17.67-16.81-.01-10.58 7.39-17.68 18.4-17.68ZM493.54 22.63h-20.4v24.01h-8.32V64.7h8.33v51.08h20.39V64.7h9.68V46.64h-9.68V22.63ZM437.86 51.24a28.97 28.97 0 0 0-18.41-6.32c-18.63 0-32.67 15.63-32.67 36.35 0 20.32 14.5 36.23 33.04 36.23a28 28 0 0 0 18.04-6.1v4.39h20.39V46.64h-20.4v4.6Zm-15.1 47.21c-8.96 0-15.47-7.28-15.47-17.31 0-10.12 6.36-17.18 15.47-17.18 9.32 0 15.84 7.02 15.84 17.06 0 10.27-6.51 17.43-15.84 17.43ZM346.56 63.97c6.07 0 10.22 1.88 14.81 6.71l1.09 1.15 16.95-9.32-1.26-1.86c-6.89-10.14-18.15-15.72-31.71-15.72-22.48 0-38.8 15.34-38.8 36.47 0 20.92 16.21 36.11 38.56 36.11 13.31 0 23.79-4.84 31.15-14.4l1.32-1.72-16.22-11.12-1.19 1.48c-3.58 4.45-8.77 6.71-15.43 6.71-10.57 0-17.67-6.76-17.67-16.81 0-10.58 7.39-17.68 18.4-17.68Z" fill="#fff"></path>
                <path d="M63.76 150.45a4.67 4.67 0 1 0 6.6 0 4.79 4.79 0 0 0-6.6 0ZM39.38 141.08a5.12 5.12 0 1 0 7.24 0 5.25 5.25 0 0 0-7.24 0ZM19.66 124.58a5.5 5.5 0 1 0 7.78 0 5.65 5.65 0 0 0-7.78 0ZM6.87 102.59a5.71 5.71 0 1 0 8.06 0 5.82 5.82 0 0 0-8.06 0ZM1.88 76.34a6.1 6.1 0 1 0 10.41 4.32c0-1.63-.64-3.16-1.79-4.31a6.22 6.22 0 0 0-8.62-.01ZM27.4 77.04a5.12 5.12 0 0 0 3.61 8.73 5.1 5.1 0 0 0 3.61-8.72 5.22 5.22 0 0 0-7.22-.01ZM33.86 51.84a5.6 5.6 0 0 0 3.94 9.53 5.5 5.5 0 0 0 3.94-1.64 5.54 5.54 0 0 0-.01-7.88 5.7 5.7 0 0 0-7.87-.01ZM51.06 33.98a6.04 6.04 0 0 0 4.26 10.3c1.6 0 3.12-.63 4.26-1.77a5.98 5.98 0 0 0 0-8.52 6.17 6.17 0 0 0-8.52-.01ZM75.73 26.89a6.4 6.4 0 0 0 9.04 9.04 6.35 6.35 0 0 0-.01-9.04 6.52 6.52 0 0 0-9.03 0ZM100.49 33.09a6.85 6.85 0 1 0 9.68 0 7 7 0 0 0-9.68 0ZM118.14 50.94a6.85 6.85 0 1 0 9.68 0 7 7 0 0 0-9.68 0ZM52.54 77.57a4.37 4.37 0 1 0 6.18-.01 4.49 4.49 0 0 0-6.18.01ZM34.4 102.36a4.8 4.8 0 1 0 6.78 0 4.91 4.91 0 0 0-6.78 0ZM52.53 120.36a4.38 4.38 0 1 0 6.18.01 4.45 4.45 0 0 0-6.18-.01ZM77.47 126.98a4.26 4.26 0 1 0 6.02 0 4.36 4.36 0 0 0-6.02 0ZM64.41 56.01a4.83 4.83 0 1 0 6.82 0 4.94 4.94 0 0 0-6.82 0ZM89.18 55.8a5.07 5.07 0 1 0 7.15.01 5.17 5.17 0 0 0-7.15-.01ZM125.3 76.28a6.19 6.19 0 1 0 8.75 0 6.34 6.34 0 0 0-8.74 0ZM101.96 76.28a6.19 6.19 0 1 0 8.74 0 6.34 6.34 0 0 0-8.74 0ZM65.05 99.4a3.81 3.81 0 0 0 2.69 6.5c1.02 0 1.97-.4 2.69-1.12a3.78 3.78 0 0 0-.01-5.38 3.9 3.9 0 0 0-5.37 0ZM6.28 50.24a6.5 6.5 0 1 0 9.18 0 6.63 6.63 0 0 0-9.18 0ZM18.87 28.15a6.96 6.96 0 0 0 9.82 9.83 6.92 6.92 0 0 0 0-9.82 7.1 7.1 0 0 0-9.82-.01ZM37.95 11.68a7.21 7.21 0 0 0 10.18 10.19 7.16 7.16 0 0 0 0-10.18 7.36 7.36 0 0 0-10.18-.01ZM61.69 2.44a7.62 7.62 0 0 0 10.76 10.77 7.56 7.56 0 0 0 2.23-5.38c0-2.03-.8-3.95-2.23-5.38a7.79 7.79 0 0 0-10.76-.01ZM88.08 2.25a7.88 7.88 0 1 0 11.16-.01 8.1 8.1 0 0 0-11.16.01ZM111.71 10.91a8.43 8.43 0 1 0 11.9 0 8.61 8.61 0 0 0-11.9 0ZM130.84 26.7a8.76 8.76 0 1 0 12.37-.01 8.98 8.98 0 0 0-12.37.01ZM143.44 48.56a9.18 9.18 0 0 0 6.48 15.65c2.45 0 4.75-.95 6.48-2.69a9.1 9.1 0 0 0 2.68-6.48c0-2.45-.95-4.75-2.69-6.48a9.38 9.38 0 0 0-12.95 0ZM147.74 73.85a9.6 9.6 0 0 0 6.78 16.38c2.56 0 4.97-1 6.78-2.81a9.53 9.53 0 0 0 2.81-6.78c0-2.56-1-4.97-2.81-6.78a9.8 9.8 0 0 0-13.56-.01ZM90.46 150.27a4.67 4.67 0 1 0 6.6 0 4.78 4.78 0 0 0-6.6 0ZM171.72 7.99a4.67 4.67 0 1 0-6.6 0 4.78 4.78 0 0 0 6.6 0ZM196.11 17.36a5.12 5.12 0 1 0-7.24 0 5.25 5.25 0 0 0 7.24 0ZM214.75 32.33a5.5 5.5 0 1 0-7.78 0 5.63 5.63 0 0 0 7.78 0ZM230.36 59.87a5.71 5.71 0 1 0-8.06 0 5.84 5.84 0 0 0 8.06 0ZM233.6 85.02a6.1 6.1 0 1 0-10.41-4.32c0 1.63.64 3.16 1.79 4.31a6.22 6.22 0 0 0 8.62.01ZM208.08 84.32a5.12 5.12 0 0 0-3.61-8.73 5.1 5.1 0 0 0-3.61 8.72 5.22 5.22 0 0 0 7.22.01ZM201.63 106.6a5.6 5.6 0 0 0-3.94-9.53 5.5 5.5 0 0 0-3.94 1.64 5.54 5.54 0 0 0 .01 7.88 5.7 5.7 0 0 0 7.87.01ZM184.43 124.46a6.04 6.04 0 0 0-4.26-10.3c-1.6 0-3.12.63-4.26 1.77a5.98 5.98 0 0 0 0 8.52 6.15 6.15 0 0 0 8.52.01ZM159.75 131.56a6.4 6.4 0 0 0-9.04-9.04 6.35 6.35 0 0 0 .01 9.04 6.54 6.54 0 0 0 9.03 0ZM135 125.35a6.85 6.85 0 1 0-9.68 0 7 7 0 0 0 9.68 0ZM117.35 110.01a6.85 6.85 0 1 0-9.68 0 7 7 0 0 0 9.68 0ZM182.95 83.79a4.37 4.37 0 1 0-6.18.01 4.49 4.49 0 0 0 6.18-.01ZM201.09 56.08a4.8 4.8 0 1 0-6.78 0 4.9 4.9 0 0 0 6.78 0ZM182.96 38.09a4.38 4.38 0 1 0-6.18-.01 4.47 4.47 0 0 0 6.18.01ZM158.01 31.46a4.26 4.26 0 1 0-6.02 0 4.36 4.36 0 0 0 6.02 0ZM171.07 102.43a4.83 4.83 0 1 0-6.82 0 4.94 4.94 0 0 0 6.82 0ZM146.31 102.64a5.07 5.07 0 1 0-7.15-.01 5.17 5.17 0 0 0 7.15.01ZM170.43 59.04a3.81 3.81 0 0 0-2.69-6.5c-1.02 0-1.97.4-2.69 1.12a3.77 3.77 0 0 0 .01 5.38 3.88 3.88 0 0 0 5.37 0ZM229.21 108.2a6.5 6.5 0 1 0-9.18 0 6.63 6.63 0 0 0 9.18 0ZM216.62 130.29a6.96 6.96 0 0 0-9.82-9.83 6.92 6.92 0 0 0 0 9.82 7.1 7.1 0 0 0 9.82.01ZM197.54 146.76a7.21 7.21 0 0 0-10.18-10.19 7.16 7.16 0 0 0 0 10.18 7.34 7.34 0 0 0 10.18.01ZM173.79 156a7.62 7.62 0 0 0-10.76-10.77 7.56 7.56 0 0 0-2.23 5.38c0 2.03.79 3.95 2.23 5.38a7.79 7.79 0 0 0 10.76.01ZM147.41 156.19a7.88 7.88 0 1 0-11.16.01 8.1 8.1 0 0 0 11.16-.01ZM124.65 148.72a8.43 8.43 0 1 0-11.9 0 8.61 8.61 0 0 0 11.9 0ZM105.53 135.64a8.76 8.76 0 1 0-12.37.01 8.96 8.96 0 0 0 12.37-.01ZM92.05 112.43a9.18 9.18 0 0 0-6.48-15.65c-2.45 0-4.75.95-6.48 2.69a9.1 9.1 0 0 0-2.68 6.48c0 2.45.95 4.75 2.69 6.48a9.38 9.38 0 0 0 12.95 0ZM87.74 87.51a9.6 9.6 0 0 0-6.78-16.38c-2.56 0-4.97 1-6.78 2.81a9.53 9.53 0 0 0-2.81 6.78c0 2.56 1 4.97 2.81 6.78a9.8 9.8 0 0 0 13.56.01ZM145.03 8.17a4.67 4.67 0 1 0-6.6 0 4.77 4.77 0 0 0 6.6 0Z" fill="#fff"></path>
            </svg></a>
    </cp-header>
    <header>
        <p class="wptheader_logo">
            <a href="https://www.catchpoint.com/platform">Platform</a>
            <a href="/">WebPageTest</a>
        </p>

        <details class="wptheader_menu">
            <summary class="wptheader_menubtn">Menu:</summary>
            <nav>
                <ul class="wptheader_nav">

                    <?= addTab('Start Test', '/'); ?>

                    <?php if (!Util::getSetting('disableTestlog')) : ?>
                        <?= addTab('Test History', FRIENDLY_URLS ? '/testlog/7/' : '/testlog.php?days=7'); ?>
                    <?php endif; //if (!Util::getSetting('disableTestlog')):
                    ?>

                    <li class="wptheader_nav_menu">
                        <details>
                            <summary><span>Solutions</span></summary>
                            <div class="wptheader_nav_menu_content">
                                <div class="wptheader_nav_menu_section">
                                    <img src="/assets/images/wpt-logo-pro-dark.svg" width="143" height="17" alt="WebPageTest Pro">
                                </div>
                                <div class="wptheader_nav_menu_section nested">
                                    <ul>
                                        <li class="wptheader_nav_menu_link"><a target="_blank" href="https://product.webpagetest.org/experiments">Opportunities & Experiments</a></li>
                                        <li class="wptheader_nav_menu_link"><a target="_blank" href="https://product.webpagetest.org/api">API</a></li>
                                        <li class="wptheader_nav_menu_link"><a target="_blank" href="https://www.webpagetest.org/carbon-control/">Carbon Control (NEW)</a></li>
                                    </ul>
                                </div>
                                <div class="wptheader_nav_menu_section wptheader_nav_cta" style="padding: 1.5rem 0 1rem;">
                                    <p class="wptheader_nav_title">Enterprise Monitoring</p>
                                    <div class="wptheader_top_right_arrow"></div>
                                </div>
                                <div class="wptheader_nav_menu_section nested">
                                    <p class="wptheader_nav_title" style="font-weight:unset;">By Team</p>
                                        <ul>
                                            <li class="wptheader_nav_menu_link"><a target="_blank" href="https://www.catchpoint.com/website-experience/web-teams?utm_source=wpt&utm_medium=navbar&utm_content=webteams">Web/SEO Teams</a></li>
                                            <li class="wptheader_nav_menu_link"><a target="_blank" href="https://www.catchpoint.com/website-experience/it-teams?utm_source=WPT&utm_medium=NavBar&utm_content=ItTeams">IT/DevOps Teams</a></li>
                                        </ul>
                                    <p class="wptheader_nav_title" style="font-weight:unset;">By Use Case</p>
                                        <ul>
                                            <li class="wptheader_nav_menu_link"><a target="_blank" href="https://www.catchpoint.com/real-user-monitoring?utm_source=WPT&utm_medium=NavBar&utm_content=rum">Real User Monitoring (RUM)</a></li>
                                            <li class="wptheader_nav_menu_link"><a target="_blank" href="https://www.catchpoint.com/application-experience/api-monitoring?utm_source=WPT&utm_medium=NavBar&utm_content=apiMonitoring">API Monitoring</a></li>
                                            <li class="wptheader_nav_menu_link"><a target="_blank" href="https://www.catchpoint.com/network-experience/dns?utm_source=WPT&utm_medium=NavBar&utm_content=dns">DNS Monitoring</a></li>
                                            <li class="wptheader_nav_menu_link"><a target="_blank" href="https://www.catchpoint.com/bgp?utm_source=WPT&utm_medium=NavBar&utm_content=bgp">BGP Monitoring</a></li>
                                            <li class="wptheader_nav_menu_link"><a target="_blank" href="https://www.catchpoint.com/network-experience/cdn?utm_source=WPT&utm_medium=NavBar&utm_content=cdn">CDN Monitoring</a></li>
                                            <li class="wptheader_nav_menu_link"><a target="_blank" href="https://www.catchpoint.com/website-experience/website-performance-monitoring?utm_source=WPT&utm_medium=NavBar&utm_content=websitePerformanceMonitoring">Website Performance Monitoring</a></li>
                                        </ul>
                                </div>
                            </div>
                        </details>
                    </li>

                    <?php if (!$is_logged_in && $supportsAuth && !EMBED && !Util::getSetting('signup_off')) : ?>
                        <?= addTab('Pricing', '/signup'); ?>
                    <?php endif; ?>

                    <li class="wptheader_nav_menu">
                        <details>
                            <summary<?php if (isset($tab) && !strcasecmp('Resources', $tab)) {
                                        echo ' class="wptheader-current"';
                                    } ?>><span>Resources</span></summary>
                                <div class="wptheader_nav_menu_content">
                                    <div class="wptheader_nav_menu_section">
                                        <ul>
                                            <li class="wptheader_nav_menu_link"><a href="https://docs.webpagetest.org/">Docs</a></li>
                                            <li class="wptheader_nav_menu_link"><a href="https://blog.webpagetest.org/">Blog</a></li>
                                            <li class="wptheader_nav_menu_link"><a href="https://product.webpagetest.org/events/">Events</a></li>
                                            <?php if (Util::getSetting('forums_url')) : ?>
                                                <li class="wptheader_nav_menu_link"><a href="<?= Util::getSetting('forums_url') ?>">Forums</a></li>
                                            <?php endif; //(Util::getSetting('forums_url')):
                                            ?>
                                            <li class="wptheader_nav_menu_link"><a href="https://store-catchpoint.myshopify.com/collections/webpagetest">Shop Gear</a></li>
                                        </ul>
                                        <a href="/learn/lightning-fast-web-performance/" class="banner_lfwp">
                                            <span class="banner_lfwp_line">Lightning-Fast <b>Web Performance</b></span>
                                            <span class="banner_lfwp_line"><b class="banner_lfwp_flag">Online Course</b> <em class="banner_lfwp_pill">Free! Start Now</em></span>
                                        </a>
                                    </div>
                                    <div class="wptheader_nav_menu_section">
                                        <p class="wptheader_nav_cta">Find us on...</p>
                                        <ul class="wptheader_nav_menu_linkgrid">
                                            <li class="wptheader_nav_menu_link"><img src="/assets/images/twitter.svg" alt=""><a href="https://twitter.com/RealWebPageTest">Twitter</a></li>
                                            <li class="wptheader_nav_menu_link"><img src="/assets/images/youtube.svg" alt=""><a href="https://www.youtube.com/channel/UC5CqJ9V7cQddZDf1DKXcy7Q">Youtube</a></li>
                                            <li class="wptheader_nav_menu_link"><img src="/assets/images/linkedin.svg" alt=""><a href="https://www.linkedin.com/company/webpagetest/">LinkedIn</a></li>
                                            <li class="wptheader_nav_menu_link"><img src="/assets/images/github.svg" alt=""><a href="https://github.com/WPO-Foundation/webpagetest/">Github</a></li>
                                        </ul>
                                    </div>
                                </div>
                        </details>
                    </li>
                    <?= addTab('About', '/about'); ?>
                </ul>

                <ul class="wptheader_acct">

                    <?php

                    if ($supportsAuth && !EMBED) {
                        if ($supportsCPAuth) {
                            $is_logged_in = isset($request_context) && !is_null($request_context->getUser()) && !is_null($request_context->getUser()->getAccessToken());
                            ?>
                            <?php if ($is_logged_in) : ?>
                                <li><a href='/account'>
                                        <?php
                                        if (!is_null($request_context->getUser()) && $request_context->getUser()->isPaid()) {
                                            echo '<em class="pro-flag">Pro</em> ';
                                        }
                                        ?>
                                        My Account</a></li>
                                <li>
                                    <form method='POST' action='/logout' class='logout-form'>
					<input type="hidden" name="csrf_token" value="<?php echo $_SESSION['csrf_token'] ?>" /> 
                                        <button type='submit'>Logout</button>
                                    </form>
                                </li>
                            <?php else : ?>
                                <li><a href="/login">Login</a></li>
                                <?php if (!Util::getSetting('signup_off')) : ?>
                                    <li><a href="/signup">Sign-up</a></li>
                                <?php endif; ?>
                            <?php endif; //$is_logged_in
                            ?>
                            <?php
                        } elseif (isset($user)) {
                            $logoutUrl = 'https://www.webpagetest.org/forums/member.php?action=logout';
                            echo "<li>Welcome, " . htmlspecialchars($user) . "</li><li><a href=\"$logoutUrl\">Logout</a></li>";
                        } elseif (isset($_COOKIE['google_email']) && isset($_COOKIE['google_id'])) {
                            $logoutUrl = 'javascript:wptLogout();';
                            $google_email = htmlspecialchars($_COOKIE['google_email']);
                            echo "<li>Welcome, $google_email </li><li><a href=\"$logoutUrl\">Logout</a></li>";
                        } elseif (Util::getSetting('google_oauth_client_id') && Util::getSetting('google_oauth_client_secret')) {
                            echo '<li><a href="/oauth/login.php">Login with Google</a></li>';
                        }
                    }
                    ?>

                </ul>
            </nav>
        </details>
    </header>
</wpt-header>
