<div class="signup-hed-contain">
    <div class="signup-hed ">
        <h1>Ready to go Pro?</h1>
        <p>All the WebPageTest features you already love,
            <strong>plus API Access &amp; No-Code Experiments!</strong>
        </p>
        <p class="plan-callout">Plans start at just <span class="signup-hed-price">$15<span class="unit">/mo</span></span></p>
    </div> <!-- ./signup-hed -->
</div>

<div class="signup-step-1-content" id="billingcycle-tab-container">
    <table class="comparison-table">
        <thead>
            <tr>
                <th>
                    <div class="h2">Compare Plans</div>
                </th>
                <th scope="col">
                    <span>Starter Plan</span>
                </th>
                <th scope="col" class="pro-plans">
                    <div class="pro-plans-header">
                        <div class="heading wpt-pro-logo"> <span class="visually-hidden">WebPageTest <em class="new-banner">Pro</em></span></div>
                        <span class="upsell">Save 20% with Annual Plans</span>
                    </div>

                    <form method="POST" id="pro-plan-form" action="/signup">
                        <input type="hidden" name="step" value="1" />
                        <div>
                            <label for="runs-per-month"> Runs/mo:</label>
                            <div data-id="monthly-plan-select-wrapper" class="hidden">
                                <select id="runs-per-month" name="plan" disabled data-cycle="/month">
                                    <?php
                                    foreach ($monthly_plans as $plan) : ?>
                                        <option value="<?= $plan->getId() ?>" data-price="<?= $plan->getMonthlyPrice() ?>">
                                            <?= $plan->getRuns() ?>
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                            <div data-id="annual-plan-select-wrapper">
                                <select id="runs-per-month" name="plan" data-cycle="/year">
                                    <?php
                                    foreach ($annual_plans as $plan) : ?>
                                        <option value="<?= $plan->getId() ?>" data-price="<?= $plan->getAnnualPrice() ?>">
                                            <?= $plan->getRuns() ?>
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label for="billing-cycle"> Plan:</label>
                            <select id="billing-cycle" name="billing-cycle">
                                <option value="annual">Annual</option>
                                <option value="monthly">Monthly</option>
                            </select>
                        </div>
                    </form>
                </th>

            </tr>
        </thead>

        <tbody>
            <tr>

                <th scope="col">Price</th>
                <td>
                    <form method="POST" action="/signup">
                        <span class="visually-hidden">Sign up for a Free Plan</span>
                        <input type="hidden" name="plan" value="free" />
                        <input type="hidden" name="step" value="1" />
                        <button type="submit" class="signup-button">Start for free</button>
                    </form>
                </td>
                <td>
                    <span class="visually-hidden">Sign up for a Pro Plan</span>
                    <button id="submit-pro-plan" class="signup-button" type="submit" form="pro-plan-form">Start for $<span data-id="plan-price"><?= count($annual_plans) > 0 ? $annual_plans[0]->getAnnualPrice() : "" ?></span><span class="unit" data-id="plan-cycle">/year</span></button>
                </td>
            </tr>
            <tr>
                <th scope="col">Monthly Test Runs</th>
                <td>300</td>
                <td>As per plan</td>
            </tr>

            <tr>
                <th scope="col">Locations</th>
                <td>30</td>
                <td>40 <sup><a href="#fn1" id="ref1">*</a></sup></td>

            </tr>

            <tr>
                <th scope="col">Browser</th>
                <td>All</td>
                <td>All</td>
            </tr>

            <tr>
                <th scope="col">Connection Speeds</th>
                <td>All</td>
                <td>All</td>
            </tr>

            <tr>
                <th scope="col">Filmstrip and Video</th>
                <td>
                    <i class="icon check" aria-hidden="true"></i>
                    <span class="visually-hidden">Yes</span>
                </td>
                <td>
                    <i class="icon check" aria-hidden="true"></i>
                    <span class="visually-hidden">Yes</span>
                </td>
            </tr>

            <tr>
                <th scope="col">Google Lighthouse</th>
                <td>
                    <i class="icon check" aria-hidden="true"></i>
                    <span class="visually-hidden">Yes</span>
                </td>
                <td>
                    <i class="icon check" aria-hidden="true"></i>
                    <span class="visually-hidden">Yes</span>
                </td>
            </tr>

            <tr>
                <th scope="col">Traceroute</th>
                <td>
                    <i class="icon check" aria-hidden="true"></i>
                    <span class="visually-hidden">Yes</span>
                </td>
                <td>
                    <i class="icon check" aria-hidden="true"></i>
                    <span class="visually-hidden">Yes</span>
                </td>
            </tr>

            <tr>
                <th scope="col">Test History</th>
                <td>13 Months</td>
                <td>13 Months</td>
            </tr>

            <tr>
                <th scope="col">Priority Tests</th>
                <td>
                    <i class="icon x-in-circle-temp" aria-hidden="true"></i>
                    <span class="visually-hidden">No</span>
                </td>
                <td>
                    <i class="icon check" aria-hidden="true"></i>
                    <span class="visually-hidden">Yes</span>
                </td>

            </tr>


            <tr>
                <th scope="col">API Access</th>
                <td>
                    <i class="icon x-in-circle-temp" aria-hidden="true"></i>
                    <span class="visually-hidden">No</span>
                </td>
                <td>
                    <i class="icon check" aria-hidden="true"></i>
                    <span class="visually-hidden">Yes</span>
                </td>

            </tr>

            <tr>
                <th scope="col">Integrations</th>
                <td>
                    <i class="icon x-in-circle-temp" aria-hidden="true"></i>
                    <span class="visually-hidden">No</span>
                </td>
                <td>
                    <i class="icon check" aria-hidden="true"></i>
                    <span class="visually-hidden">Yes</span>
                </td>

            </tr>

            <tr>
                <th scope="col">Private Tests <em class="new-banner">NEW</em></th>
                <td>
                    <i class="icon x-in-circle-temp" aria-hidden="true"></i>
                    <span class="visually-hidden">No</span>
                </td>
                <td>
                    <i class="icon check" aria-hidden="true"></i>
                    <span class="visually-hidden">Yes</span>
                </td>

            </tr>

            <tr>
                <th scope="col">Bulk Testing <em class="new-banner">NEW</em></th>
                <td>
                    <i class="icon x-in-circle-temp" aria-hidden="true"></i>
                    <span class="visually-hidden">No</span>
                </td>
                <td>
                    <i class="icon check" aria-hidden="true"></i>
                    <span class="visually-hidden">Yes</span>
                </td>

            </tr>
            <tr>
                <th scope="col">Opportunities <em class="new-banner">NEW</em></th>
                <td>
                    <i class="icon check" aria-hidden="true"></i>
                    <span class="visually-hidden">Yes</span>
                </td>
                <td>
                    <i class="icon check" aria-hidden="true"></i>
                    <span class="visually-hidden">Yes</span>
                </td>
            </tr>
            <tr>
                <th scope="col">Experiments <em class="new-banner">NEW</em></th>
                <td>
                    <i class="icon x-in-circle-temp" aria-hidden="true"></i>
                    <span class="visually-hidden">No</span>
                </td>
                <td>
                    <i class="icon check" aria-hidden="true"></i>
                    <span class="visually-hidden">Yes</span>
                </td>


            <tr>
                <th scope="col">Support</th>
                <td>
                    Forums
                </td>
                <td>
                    Dedicated Support
                </td>
            </tr>

            <tr>
                <th scope="col"></th>
                <td></td>
                <td>
                    Need a custom plan?
                    <a class="button signup-button" href="https://www.product.webpagetest.org/contact">Contact Us</a>
                </td>
            </tr>

        </tbody>
    </table>
    <p><sup id="fn1">* Our list of available test locations is continually growing.</sup></p>

    <div class="FAQ">
        <h3>What' s included in WebPageTest Pro?</h3>
        <dl class="faq">
            <dt>
                <button type="button" aria-expanded="false" aria-controls="faq1_desc">What is WebPageTest Pro and what is WebPageTest Starter?</button>
            </dt>
            <dd>
                <div id="faq1_desc" class="desc">
                    <p><strong>WebPageTest Pro </strong> our premium, paid subscription plan that unlocks powerful functionality and features for WebPageTest including, but not limited to: bulk testing, premium testing locations, high priority in testing queues, the WebPageTest API, experiments, dedicated support and private tests.
                    </p>
                    <p><strong>WebPageTest Starter</strong> is our free plan available to all users to run WebPageTest runs that provide all the performance metrics that WebPageTest has provided for years plus access to the new Opportunities report.
                    </p>
                    <p>Both WebPageTest Starter and Pro give you access to save your Test History for 13 months.
                    </p>
                </div>
            </dd>
            <dt>
                <button type="button" aria-expanded="false" aria-controls="faq2_desc">How do you define a test run?</button>
            </dt>
            <dd>
                <div id="faq2_desc" class="desc">
                    <p><em>FOR ALL PLANS,</em> A test on WebPageTest is comprised of one or more test runs. A test run is defined as a single page load within a test. Here are a few examples:</p>
                    <ul class="bulleted-list">
                        <li>A test from a single browser and location, with 3 test runs, first view only, counts as three test runs. (3 runs * 1 load per run)</li>
                        <li>A test from a single browser and location, with 5 test runs, first and repeat views for each run, counts as 10 test runs (5 runs * 2 loads per run)</li>
                        <li>A test from a single browser and location, with 4 tests runs, first and repeat views for each run, and an additional Lighthouse run, counts as 9 test runs ( (4 runs * 2 loads per run) + 1 Lighthouse run)</li>
                        <li>An experiment from a single browser and location, with 2 test runs, first view only for each run, counts as 4 runs (2 runs * 2 tests (one for the experiment, one for the control run).</li>
                    </ul>
                </div>
            </dd>
            <dt>
                <button type="button" aria-expanded="false" aria-controls="faq3_desc">What countries and browsers do you support with the WebPageTest </button>
            </dt>
            <dd>
                <div id="faq3_desc" class="desc">
                    <p><strong>WebPageTest Starter</strong> gives you access to 30 locations worldwide, including mainland China. With WebPageTest Pro, you get access to 11 more premium locations. </p>
                    <p>WebPageTest is always up-to-date on the current version of every browser and you can test on Chrome (stable, beta, canary), Firefox (stable, beta, ESR), Microsoft Edge (dev) and Brave. </p>
                    <p><strong>WebPageTest Pro</strong> also supports mobile emulation testing. You can test mobile content by emulating an Android browser by passing “mobile=1” as an API option.</p>

                </div>
            </dd>
            <dt>
                <button type="button" aria-expanded="false" aria-controls="faq4_desc">What are Opportunities and Experiments?</button>
            </dt>
            <dd>
                <div id="faq4_desc" class="desc">
                    <p>Opportunities and Experiments are a powerful combination that will let you quickly identify areas of improvement for your website and test the impact of any relevant optimizations without ever having to write a line of code.</p>
                    <p>
                        Opportunities are recommendations that are broken down into three categories:</p>
                    <ul class="bulleted-list">
                        <li>Quickness</li>
                        <li>Usability</li>
                        <li>Resilience</li>
                    </ul>
                    <p>Opportunities are a free feature of WebPageTest provided to all users.</p>
                    <p>For every opportunity, you will be presented with some combination of tips (suggestions for what to do to improve) and experiments (the ability to apply optimizations right within the WebPageTest sandbox). When you choose to run an experiment, WebPageTest applies the optimization in our sandbox environment and then runs a test (alongside a control test which uses our sandbox environment without applying the optimization), and presents you with results showing you how significant, or insignificant, the improvement was.
                    </p>
                    <p>Experiments are a paid feature and are only available to WebPageTest Pro subscribers.</p>

                </div>
            </dd>
            <dt>
                <button type="button" aria-expanded="false" aria-controls="faq5_desc">Is there a free trial where I can test WebPageTest Pro?</button>
            </dt>
            <dd>
                <div id="faq5_desc" class="desc">
                    <p>We provide 1 free experiment per test for you to check out WebPageTest Experiments. You can also run Experiments from our inhouse webpage called <a href="https://www.webpagetest.org/themetrictimes/index.php">The Metric Times</a> where we have builti in anti-patterns for easy testing.</p>
                    <p>We do not have a free trial option apart from the above 2 options, since Web PageTest Pro gives you all the metrics (except for the option to run the experiments) you see on a typical WebPageTest test result page as well as in the JSON today for any test you run on <a href="https://www.webpagetest.org">www.webpagetest.org</a>.</p>
                </div>
            </dd>
            <dt>
                <button type="button" aria-expanded="false" aria-controls="faq6_desc">Is there a daily limit for the test runs?</button>
            </dt>
            <dd>
                <div id="faq6_desc" class="desc">
                    <p>There is a monthly limit on the total tests you can run with the WebPageTest Pro and WebPageTest Starter Plans, based on the subscription plan you choose. There is currently no daily limit on top of that monthly limit. </p>
                </div>
            </dd>
            <dt>
                <button type="button" aria-expanded="false" aria-controls="faq7_desc">Do you provide any developer integrations that I can use with WebPageTest Pro?</button>
            </dt>
            <dd>
                <div id="faq7_desc" class="desc">
                    <p>There are several existing first-party integrations built with the WebPageTest API, including our <a href="https://docs.webpagetest.org/integrations/#webpagetest-github-action">GitHub Action</a>, <a href="https://docs.webpagetest.org/integrations/#webpagetest-slack-bot">Slack Bot<a>, <a href="https://docs.webpagetest.org/integrations/#webpagetest-visual-studio-code-extension">Visual Studio Code Extension</a>, and our <a href="https://docs.webpagetest.org/integrations/#webpagetest-api-wrapper-for-nodejs">Node.js API wrapper</a> (the preferred way to interact with our API).</p>
                    <p>There are also numerous integrations <a href="https://docs.webpagetest.org/integrations/#community-built-integrations">built and maintained by our community members.</a></p>
                    <p>You can find more ideas of how to use the API in our <a href="https://github.com/WebPageTest/WebPageTest-API-Recipes">constantly growing recipes repository.</a></p>
                </div>
            </dd>

            <dt>
                <button type="button" aria-expanded="false" aria-controls="faq8_desc">How will I be charged?</button>
            </dt>
            <dd>
                <div id="faq8_desc" class="desc">
                    <p>For monthly and annual subscriptions plans, your credit card will be automatically billed when you sign up and purchase the subscription, you'll be able to access your payment history under Billing History in My Account on <a href="https://www.webpagetest.org">www.webpagetest.org</a>. All subscription plans can be canceled at any time without penalty. Once you choose to cancel, it stops the WebPageTest Pro subscription from auto-renewing for the next billing cycle. You’ll continue to have access to run tests for that plan, until the end of your current billing period.
                    </p>
                    <p>For Custom Enterprise plans where you want to run more than 20000 tests per month, please <a href="https://product.webpagetest.org/contact">contact us</a>.
                    </p>
                    <p>If you are based out of the United States of America, You will be charged in US Dollars, but the exact amount you will see on your credit card statement may vary, depending on foreign exchange rates and any foreign transaction fees your bank may impose.</p>

                </div>
            </dd>

            <dt>
                <button type="button" aria-expanded="false" aria-controls="faq9_desc">What payment methods do you support?</button>
            </dt>
            <dd>
                <div id="faq9_desc" class="desc">
                    <p>We accept payment via Credit Card (VISA, Mastercard, American Express, JCB, Maestro, Discover, Diners Club International, UnionPay). Please ensure the accuracy of your payment method and that it is properly funded to avoid any issues with payment acceptance.</p>
                    <p>We do not accept and will not ask you to provide payments with cash or a physical check.</p>
                    <p>For Custom Enterprise plans, requiring more than 20K tests per month, please <a href="https://www.product.webpagetest.org/contact">contact us</a>.</p>
                </div>
            </dd>

            <dt>
                <button type="button" aria-expanded="false" aria-controls="faq10_desc">How secure is my payment?</button>
            </dt>
            <dd>
                <div id="faq10_desc" class="desc">
                    <p>All payments are securely processed over HTTPS and your card information never touches our servers. All payment processing is done by a level 1 PCI compliant third-party credit card processor. All details are sent over SSL, which is a 2048-bit RSA-encrypted channel. Our payment gateway also adheres to card networks' requirements and regulations surrounding payment processing.</p>
                </div>
            </dd>
            <dt>
                <button type="button" aria-expanded="false" aria-controls="faq11_desc">Can I add more users to my WPT Pro or Starter account?</button>
            </dt>
            <dd>
                <div id="faq11_desc" class="desc">
                    <p>Currently, we only support one user account to sign in and set up your account for WebPageTest Starter or to purchase the WebPageTest Pro subscriptions. However, if you use the WebPageTest API under the Pro subscription, you can generate up to 30 API Consumer keys for multiple use cases and teams, from a single WebPageTest Pro account. Generate a new key by clicking on “+ New API Key” in your account page. </p>
                    <p>We have plans to support adding multiple users and defining roles in the future.
                    </p>
                </div>
            </dd>
            <dt>
                <button type="button" aria-expanded="false" aria-controls="faq12_desc">What is the cancellation policy? </button>
            </dt>
            <dd>
                <div id="faq12_desc" class="desc">
                    <p>You can choose to cancel anytime during the subscription period. Once you choose to cancel, it stops the WebPageTest Pro subscription from auto-renewing for the next billing cycle. You'll continue to have access to run tests for that plan, until the end of your current billing period. When you cancel, you cancel only the subscription. You'll continue to have access to the WebPageTest account and history of the manual tests you ran with that account. Please note all subscriptions are automatically renewed unless explicitly cancelled.
                    </p>
                </div>
            </dd>
        </dl>

    </div> <!-- ./faq-->


</div><!-- /.signup-step-1-content -->