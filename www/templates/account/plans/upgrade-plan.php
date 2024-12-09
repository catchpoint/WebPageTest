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
              <a href="<?= $support_link ?>"><span>Contact Support</span></a>
            </div>
        <?php endif; ?>
    </div>
    <form id="wpt-account-upgrade-choose" method="post" name="selectPlan" action="/account">
        <input type='hidden' name='type' value='upgrade-plan-1' />
        <fieldset class="wpt-plans select-tab-container">
            <div class="select-tabs">
                <h2 class="wpt-pro-logo"><span class="visually-hidden"> Web Page Test PRO</span> </h2>
                <label for="pro-plan-selector"> Plan:</label>
                <select name="plans" id="pro-plan-selector">
                    <option value="annual">Annual</option>
                    <option value="monthly">Monthly</option>
                </select>
                <p>Save 20% with Annual Plans</p>
            </div>
            <div class="upgrade-legend">

            </div>
            <div class="wpt-plan-set annual-plans">
                <?php
                $annual_plans = $plans->getAnnualPlans();
                foreach ($annual_plans as $key => $plan) :
                    $reccomended = ($key === 1) ? 'wpt-plan__reccomended' : '';
                    $isCurrentPlan = (isset($wptCustomer) && !is_null($wptCustomer)) ? strtolower($wptCustomer->getWptPlanId()) == strtolower($plan->getId()) : false;
                    $isUpgrade = $is_paid ? $plan->isUpgrade($oldPlan) : true;
                    $activePlan = $isCurrentPlan ? 'wpt-plan__active' : '';
                    $disabled =  !$is_canceled && $isCurrentPlan ? 'disabled' : '';
                    $upgrade = $isUpgrade ? 'upgrade' : 'downgrade';
                    $buttonCopy = $isCurrentPlan ? 'Current Plan' : $upgrade;
                    $plan_block = <<<HTML
                  <div class="form-wrapper-radio">
                    <input type="radio" id="annual-{$plan->getId()}" name="plan" value="{$plan->getId()}" {$disabled}/>
                    <label class="wpt-plan card {$reccomended} {$activePlan}" for="annual-{$plan->getId()}">
                      <h5> Annual Pro </h5>
                      <div>{$plan->getRuns()}runs/mo</div>
                      <div><strong>\${$plan->getAnnualPrice()}</strong>/Year</div>
                      <span aria-hidden="true" class="pill-button yellow"><span class="{$buttonCopy}-icon upgrade-icon__black">{$buttonCopy}</span></span>
                  </div>
                HTML;
                    echo $plan_block;
                endforeach; ?>
            </div>
            <div class="wpt-plan-set monthly-plans hidden">

                <?php
                $monthly_plans = $plans->getMonthlyPlans();
                foreach ($monthly_plans as $key => $plan) :
                    $isCurrentPlan = isset($wptCustomer) ? strtolower($wptCustomer->getWptPlanId()) == strtolower($plan->getId()) : false;
                    $isUpgrade = $is_paid ? $plan->isUpgrade($oldPlan) : true;
                    $activePlan = $isCurrentPlan ? 'wpt-plan__active' : '';
                    $disabled =  !$is_canceled && $isCurrentPlan ? 'disabled' : '';
                    $upgrade = $isUpgrade ? 'upgrade' : 'downgrade';
                    $buttonCopy = $isCurrentPlan ? 'Current Plan' : $upgrade;
                    $plan_block = <<<HTML
                <div class="form-wrapper-radio">
                    <input type="radio" id="monthly-{$plan->getId()}" name="plan" value="{$plan->getId()}" required  {$disabled}/>
                    <label class="card wpt-plan {$activePlan}" for="monthly-{$plan->getId()}">
                        <h5>Monthly Pro</h5>
                        <div>{$plan->getRuns()} runs/mo</div>
                        <div><strong>\${$plan->getMonthlyPrice()}</strong>/Month</div>
                        <span aria-hidden="true" class="pill-button yellow"><span class="{$buttonCopy}-icon upgrade-icon__black">{$buttonCopy}</span></span>
                    </label>
                </div>
                HTML;
                    echo $plan_block;
                endforeach; ?>
            </div>
        </fieldset>
        <div class="card">
            <p class="center-banner">Need a custom plan? <a class="button pill-button green" href=" https://www.product.webpagetest.org/contact"> Let's Talk</a></p>
        </div>

        <input type='hidden' name='csrf_token' value='<?= $csrf_token ?>' />
    </form>


    <div class="card-section">
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
                    </th>
                    <th scope="col" class="expert-plan">
                        <div class="expert-plan-header">
                            <div class="signup-special-price">Limited-time <br/>special price</div>
                            <div>
                                <div class="heading"><span>Expert</span></div>
                                <span class="upsell">Starting from 10M pageviews (RUM) + 30K runs/month</span>
                            </div>
                        </div>
                    </th>
                </tr>
            </thead>

            <tbody>
                <tr>
                    <th scope="col">Monthly Test Runs</th>
                    <td class="info">300</td>
                    <td class="info">As per plan</td>
                    <td class="info">As per contract</td>
                </tr>

                <tr>
                    <th scope="col">New User Experience</th>
                    <td>
                        <i class="icon x-in-circle-temp" aria-hidden="true"></i>
                        <span class="visually-hidden">No</span>
                    </td>
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
                    <th scope="col">Real User Monitoring (RUM)</th>
                    <td>
                        <i class="icon x-in-circle-temp" aria-hidden="true"></i>
                        <span class="visually-hidden">No</span>
                    </td>
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
                    <th scope="col">Single Sign On (SSO)</th>
                    <td>
                        <i class="icon x-in-circle-temp" aria-hidden="true"></i>
                        <span class="visually-hidden">No</span>
                    </td>
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
                    <th scope="col">DNS Monitoring</th>
                    <td>
                        <i class="icon x-in-circle-temp" aria-hidden="true"></i>
                        <span class="visually-hidden">No</span>
                    </td>
                    <td>
                        <i class="icon x-in-circle-temp" aria-hidden="true"></i>
                        <span class="visually-hidden">No</span>
                    </td>
                    <td class="info">
                        Ask your account team
                    </td>
                </tr>

                <tr>
                    <th scope="col">CDN Monitoring</th>
                    <td>
                        <i class="icon x-in-circle-temp" aria-hidden="true"></i>
                        <span class="visually-hidden">No</span>
                    </td>
                    <td>
                        <i class="icon x-in-circle-temp" aria-hidden="true"></i>
                        <span class="visually-hidden">No</span>
                    </td>
                    <td class="info">
                        Ask your account team
                    </td>
                </tr>

                <tr>
                    <th scope="col">Locations</th>
                    <td>30</td>
                    <td>40<sup><a href="#fn1" id="ref2">*</a></sup></td>
                    <td>40<sup><a href="#fn1" id="ref1">*</a></sup></td>
                </tr>

                <tr>
                    <th scope="col">Browser</th>
                    <td>All</td>
                    <td>All</td>
                    <td>All</td>
                </tr>

                <tr>
                    <th scope="col">Connection Speeds</th>
                    <td>All</td>
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
                    <td>
                        <i class="icon check" aria-hidden="true"></i>
                        <span class="visually-hidden">Yes</span>
                    </td>
                </tr>

                <?php if (GetSetting('traceroute_enabled')): ?>
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
                    <td>
                        <i class="icon check" aria-hidden="true"></i>
                        <span class="visually-hidden">Yes</span>
                    </td>
                </tr>
                <?php endif; ?>

                <tr>
                    <th scope="col">Test History</th>
                    <td>13 Months</td>
                    <td>13 Months</td>
                    <td>Up to 7 years</td>
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
                    <td class="info">
                        Coming Soon
                    </td>
                </tr>

                <tr>
                    <th scope="col">Private Tests</th>
                    <td>
                        <i class="icon x-in-circle-temp" aria-hidden="true"></i>
                        <span class="visually-hidden">No</span>
                    </td>
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
                    <th scope="col">Bulk Testing</th>
                    <td>
                        <i class="icon x-in-circle-temp" aria-hidden="true"></i>
                        <span class="visually-hidden">No</span>
                    </td>
                    <td>
                        <i class="icon check" aria-hidden="true"></i>
                        <span class="visually-hidden">Yes</span>
                    </td>
                    <td class="info">
                        Coming Soon
                    </td>
                </tr>

                <tr>
                    <th scope="col">Opportunities</th>
                    <td>
                        <i class="icon check" aria-hidden="true"></i>
                        <span class="visually-hidden">Yes</span>
                    </td>
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
                    <th scope="col">Experiments</th>
                    <td>
                        <i class="icon x-in-circle-temp" aria-hidden="true"></i>
                        <span class="visually-hidden">No</span>
                    </td>
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
                    <th scope="col">Custom Metrics</em></th>
                    <td>
                        <i class="icon check" aria-hidden="true"></i>
                        <span class="visually-hidden">Yes</span>
                    </td>
                    <td>
                        <i class="icon check" aria-hidden="true"></i>
                        <span class="visually-hidden">Yes</span>
                    </td>
                    <td class="info">
                        Coming Soon
                    </td>
                </tr>

                <tr>
                    <th scope="col">Scripted Test</th>
                    <td class="info">
                        <i class="icon check" aria-hidden="true"></i><small>(limited to 3 steps)</small>
                        <span class="visually-hidden">Yes</span>
                    </td>
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
                    <th scope="col">Carbon Control</th>
                    <td>
                        <i class="icon check" aria-hidden="true"></i>
                        <span class="visually-hidden">Yes</span>
                    </td>
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
                    <th scope="col">AI-powered dashboards</th>
                    <td>
                        <i class="icon x-in-circle-temp" aria-hidden="true"></i>
                        <span class="visually-hidden">No</span>
                    </td>
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
                    <th scope="col">Scheduled Tests</th>
                    <td>
                        <i class="icon x-in-circle-temp" aria-hidden="true"></i>
                        <span class="visually-hidden">No</span>
                    </td>
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
                    <th scope="col">BGP Monitoring</th>
                    <td>
                        <i class="icon x-in-circle-temp" aria-hidden="true"></i>
                        <span class="visually-hidden">No</span>
                    </td>
                    <td>
                        <i class="icon x-in-circle-temp" aria-hidden="true"></i>
                        <span class="visually-hidden">No</span>
                    </td>
                    <td class="info">
                        Ask your account team
                    </td>
                </tr>

                <tr>
                    <th scope="col">Internet Sonar</th>
                    <td>
                        <i class="icon x-in-circle-temp" aria-hidden="true"></i>
                        <span class="visually-hidden">No</span>
                    </td>
                    <td>
                        <i class="icon x-in-circle-temp" aria-hidden="true"></i>
                        <span class="visually-hidden">No</span>
                    </td>
                    <td class="info">
                        Ask your account team
                    </td>
                </tr>

                <tr>
                    <th scope="col">Support</th>
                    <td class="info">
                        Forums
                    </td>
                    <td class="info">
                        Dedicated Support
                    </td>
                    <td class="info">
                        Assigned CSM team
                    </td>
                </tr>

                <tr>
                    <th scope="col"></th>
                    <td></td>
                    <td>
                        <div class="help">
                            <div class="need-help info">Need a custom plan?</div>
                            <a class="button signup-button" href="https://www.product.webpagetest.org/contact">Contact Us</a>
                        </div>
                    </td>
                    <td>
                        <div class="help">
                            <a class="button signup-button" href="https://www.product.webpagetest.org/expert-plan">Talk to Us</a>
                        </div>
                    </td>
                </tr>

            </tbody>
        </table>
    </div>
</div>