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
?>

<wpt-header>
    <header>
        <a class="wptheader_logo" href="/">
            <img src="/assets/images/wpt-logo.svg" alt="WebPageTest by Catchpoint: Home">
        </a>
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
                            <summary><span>Products</span></summary>
                            <div class="wptheader_nav_menu_content">
                                <div class="wptheader_nav_menu_section">
                                    <img src="/assets/images/wpt-logo-pro-dark.svg" width="143" height="17" alt="WebPageTest Pro">
                                </div>
                                <div class="wptheader_nav_menu_section">
                                    <ul>
                                        <li class="wptheader_nav_menu_link"><a href="https://product.webpagetest.org/experiments">Opportunities & Experiments</a></li>
                                        <li class="wptheader_nav_menu_link"><a href="https://product.webpagetest.org/api">API</a></li>
                                    </ul>
                                </div>
                                <div class="wptheader_nav_menu_section">
                                    <?php
                                    $user_exists = !is_null($request_context) && !is_null($request_context->getUser());
                                    $is_paid_user = $user_exists && $request_context->getUser()->isPaid();
                                    if (!$is_paid_user && !Util::getSetting('signup_off')) {
                                        ?>
                                        <p class="wptheader_nav_cta">
                                            <span>Ready to go <strong>Pro?</strong></span>
                                            <a href="/signup">Compare Plans</a>
                                        </p>
                                        <?php
                                    }
                                    ?>
                                </div>
                            </div>
                        </details>
                    </li>

                    <?php if ($supportsAuth && !EMBED && !Util::getSetting('signup_off')) : ?>
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
