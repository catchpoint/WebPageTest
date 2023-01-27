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
        <div class="upgrade-plan-feature-list-info">
            <h3>What's included in Pro?</h3>

            <ul class="upgrade-plan-feature-list">
                <li>Bulk Testing <em class="new-banner">NEW</em></li>
                <li>Opportunities <em class="new-banner">NEW</em></li>
                <li>Experiments <em class="new-banner">NEW</em></li>
                <li>300+ manual tests</li>
                <li>40 Locations <sup><a href="#fn1" id="ref1">*</a></sup></li>
                <li>All Browsers</li>
                <li>All Connection Speeds</li>
                <li>Filmstrip and Video</li>
                <li>Google Lighthouse</li>
                <li>Traceroute</li>
                <li>13 month Test History</li>
                <li>Priority Tests</li>
                <li>API Access</li>
                <li>Integrations</li>
                <li>Private Tests <em class="new-banner">NEW</em></li>
                <li>
                    Dedicated Support
                </li>
                <li></li>
                <li></li>
            </ul>
            <p><sup id="fn1">* Our list of available test locations is continually growing.</sup></p>


        </div>
    </div>
</div>