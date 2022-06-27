<div class="my-account-page page_content">
    <ul class="breadcrumbs">
        <li><a href="/account">Account Settings</a></li>
        <li> Update Plan</li>
    </ul>
    <!-- Page Subheader -->
    <div class="subhed">
        <h1>Update Plan</h1>
        <?php if ($is_paid) : ?>
            <div class="contact-support-button">
                <a href="https://support.webpagetest.org"><span>Contact Support</span></a>
            </div>
        <?php endif; ?>
    </div>
    <form id="wpt-account-upgrade-choose" method="post" name="selectPlan" action="/account">
        <input type='hidden' name='type' value='upgrade-plan-1' />
        <p class="h3 center-banner">Save 20% by paying annually!</p>
        <fieldset class="wpt-plans radiobutton-tab-container">
            <legend for="pro-plan-selector" class="visually-hidden"> Choose payment plan frequency:</legend>
            <input id="annual-plans" type="radio" name="plans" value="annual" checked />
            <input id="monthly-plans" type="radio" name="plans" value="monthly" />
            <div class="radiobutton-group subscription-type-selector" id="pro-plan-selector">
                <div class="radio-button">
                    <label for="annual-plans">Annual</label>
                </div>
                <div class="radio-button">
                    <label for="monthly-plans">Monthly</label>
                </div>
            </div>
            <div class="wpt-plan-set annual-plans">
                <?php
                foreach ($annual_plans as $key => $plan) :
                    $selected = ($key === 1) ? 'checked' : '';
                    $plan_block = <<<HTML
                  <div class="form-wrapper-radio">
                    <input type="radio" id="annual-{$plan['id']}" name="plan" value="{$plan['id']}" required  {$selected}/>
                    <label class="wpt-plan card" for="annual-{$plan['id']}">
                      <h5>{$plan['name']}</h5>
                      <div><strong>\${$plan['annual_price']}</strong>/Year</div>
                      <span aria-hidden="true" class="pill-button yellow"><span>Select</span></span>
                    </label>
                  </div>
                HTML;
                    echo $plan_block;
                endforeach; ?>
            </div>
            <div class="wpt-plan-set monthly-plans">
                <?php foreach ($monthly_plans as $key => $plan) :
                    $plan_block = <<<HTML
                <div class="form-wrapper-radio">
                    <input type="radio" id="monthly-{$plan['id']}" name="plan" value="{$plan['id']}" required />
                    <label class="card wpt-plan" for="monthly-{$plan['id']}">
                        <h5>{$plan['name']}</h5>
                        <div><strong>\${$plan['price']}</strong>/Month</div>
                        <span aria-hidden="true" class="pill-button yellow"><span>Select</span></span>
                    </label>
                </div>
                HTML;
                    echo $plan_block;
                endforeach; ?>
            </div>
        </fieldset>
        <div class="card">
            <div><a href=" https://www.product.webpagetest.org/contact">Need more runs? Let's Talk</a></div>
        </div>

        <input type='hidden' name='csrf_token' value='<?= $csrf_token ?>' />
    </form>
    <div class="card subscribe">
        <div class="card-section">
            <div class="info">
                <p style="line-height: 1.5">WebPageTest Pro plans bring full access to the power and depth of WebPageTest's analysis, letting you pull performance data into your existing workflows and processes. It also includes access to No-Code Experiments, the WebPageTest API, bulk testing, and more!</p>
                <h3>Plan Features Comparison</h3>
                <!-- comparison table -->
                <table class="comparison-table">
                    <thead>
                        <tr>
                            <td></td>
                            <th scope="col">
                                <div class="plan-selector">
                                    <p class="plan-name">Starter</p>
                                </div>
                            </th>
                            <th scope="col">
                                <div class="plan-selector">
                                    <p class="plan-name">Pro</p>
                                </div>
                            </th>
                        </tr>
                    </thead>

                    <tbody>
                        <tr>
                            <th scope="col">Runs Included</th>
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

                        <tr class="custom-plan-mobile">
                            <th>Looking for something custom or have additional questions?</th>

                            <td style="border:none">
                                <a class="button signup-button" href="https://www.product.webpagetest.org/contact">Contact Us</a>
                            </td>
                        </tr>

                    </tbody>
                </table>
                <p><sup id="fn1">* Our list of available test locations is continually growing.</sup></p>


            </div>
        </div>
    </div>
</div>