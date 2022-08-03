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
            <div class="wpt-plan-set annual-plans">
                <?php
                foreach ($annual_plans as $key => $plan) :
                    $reccomended = ($key === 1) ? 'wpt-plan__reccomended' : '';
                    $isCurrentPlan = isset($wptCustomer) ? strtolower($wptCustomer->getWptPlanId()) == strtolower($plan->getId()) : false;
                    $activePlan = $isCurrentPlan ? 'wpt-plan__active' : '';
                    $disabled =  $isCurrentPlan ? 'disabled' : '';
                    $plan_block = <<<HTML
                  <div class="form-wrapper-radio">
                    <input type="radio" id="annual-{$plan->getId()}" name="plan" value="{$plan->getId()}" {$disabled}/>
                    <label class="wpt-plan card {$reccomended} {$activePlan}" for="annual-{$plan->getId()}">
                      <h5> Annual Pro </h5>
                      <div>{$plan->getRuns()}runs/mo</div>
                      <div><strong>\${$plan->getAnnualPrice()}</strong>/Year</div>
                      <span aria-hidden="true" class="pill-button yellow"><span>Select</span></span>
                    </label>
                  </div>
                HTML;
                    echo $plan_block;
                endforeach; ?>
            </div>
            <div class="wpt-plan-set monthly-plans hidden">
                <?php foreach ($monthly_plans as $key => $plan) :
                    $isCurrentPlan = isset($wptCustomer) ? strtolower($wptCustomer->getWptPlanId()) == strtolower($plan->getId()) : false;
                    $activePlan = $isCurrentPlan ? 'wpt-plan__active' : '';
                    $disabled =  $isCurrentPlan ? 'disabled' : '';
                    $plan_block = <<<HTML
                <div class="form-wrapper-radio">
                    <input type="radio" id="monthly-{$plan->getId()}" name="plan" value="{$plan->getId()}" required  {$disabled}/>
                    <label class="card wpt-plan {$activePlan}" for="monthly-{$plan->getId()}">
                        <h5>Monthly Pro</h5>
                        <div>{$plan->getRuns()} runs/mo</div>
                        <div><strong>\${$plan->getMonthlyPrice()}</strong>/Month</div>
                        <span aria-hidden="true" class="pill-button yellow"><span>Select</span></span>
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
        <div class="info">
            <!-- comparison table -->
            <table class="account-upgrade-comparison-table comparison-table">
                <thead>
                    <tr>
                        <th>
                            <h3>What's included in Pro?</h3>
                        </th>
                        <th scope="col">

                        </th>
                        <th scope="col">

                        </th>
                    </tr>
                </thead>

                <tbody>
                    <tr>
                        <td>Bulk Testing <em class="new-banner">NEW</em></td>
                        <td>Opportunities <em class="new-banner">NEW</em></td>

                        <td>Experiments <em class="new-banner">NEW</em></td>
                    </tr>
                    <tr>
                        <td>300+ manual tests</td>
                        <td>40 Locations <sup><a href="#fn1" id="ref1">*</a></sup></td>
                        <td>All Browsers</td>
                    </tr>

                    <tr>
                        <td>All Connection Speeds</td>
                        <td>Filmstrip and Video</td>
                        <td>Google Lighthouse</td>
                    </tr>

                    <tr>
                        <td>Traceroute</td>
                        <td>13 month Test History</td>
                        <td>Priority Tests</td>
                    </tr>

                    <tr>
                        <td>API Access</td>
                        <td>Integrations</td>
                        <td>Private Tests <em class="new-banner">NEW</em></td>
                    </tr>




                    <td>
                        Dedicated Support
                    </td>
                    <td></td>
                    <td></td>
                    </tr>

                </tbody>
            </table>
            <p><sup id="fn1">* Our list of available test locations is continually growing.</sup></p>


        </div>
    </div>
</div>