<div class="signup-hed-contain">
    <div class="signup-hed ">
        <h1>Ready to go Pro?</h1>
        <p>All the WebPageTest features you already love,
            <strong>plus API Access &amp; No-Code Experiments!</strong>
        </p>
        <p class="plan-callout">Plans start at just <span class="signup-hed-price">$15/mo</span></p>
    </div> <!-- ./signup-hed -->
</div>

<div class="signup-step-1-content radiobutton-tab-container">
    <h2> Save 20% by paying annually!</h2>
    <!-- css only tabs. The html is in this order for a reason. -->
    <label for="pro-plan-selector" class="visually-hidden"> Choose payment plan frequency:</label>
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

    <table class="comparison-table">
        <thead>
            <tr>
                <td></td>
                <th scope="col">
                    <div class="plan-selector">
                        <form method="POST" action="/signup">
                            <p class="plan-name">Starter</p>
                            <div class="runs"><b>300 Runs</b>/mo</div>
                            <div class="price">Free</div>
                            <input type="hidden" name="plan" value="free" />
                            <input type="hidden" name="step" value="1" />
                            <input type="hidden" name="csrf_token" value="<?= $csrf_token ?>" />
                            <input type="hidden" name="auth_token" value="<?= $auth_token ?>" />
                            <button type="submit" class="signup-button">Start for free</button>
                        </form>
                    </div>
                </th>
                <th scope="col">
                    <div class="plan-selector">
                        <p class="plan-name">Pro</p>
                        <div class="plan annual">
                            <form method="POST" action="/signup">
                                <label class="visually-hidden" for="annual-plan">Select Number of Runs per
                                    month</label>
                                <select name="plan" id="annual-plan" class="plan-select" onchange="changePrice('annual')">
                                    <?php foreach ($annual_plans as $plan) : ?>
                                        <option value="<?= $plan->getId() ?>" data-price="<?= $plan->getAnnualPrice() ?>" data-price-monthly="<?= $plan->getMonthlyPrice() ?>">
                                            <?= $plan->getRuns() ?> Runs/mo
                                            ($<?= $plan->getAnnualPrice() ?>/<?= $plan->getBillingFrequency() ?>)</option>
                                    <?php endforeach; ?>
                                </select>
                                <div class="price">
                                    $<span><?= $annual_plans[0]->getAnnualPrice() ?></span>
                                    /<?= $annual_plans[0]->getBillingFrequency() ?>
                                </div>
                                <input type="hidden" name="csrf_token" value="<?= $csrf_token ?>" />
                                <input type="hidden" name="auth_token" value="<?= $auth_token ?>" />
                                <input type="hidden" name="step" value="1" />
                                <button class="signup-button" type="submit">Select Plan</button>
                            </form>
                        </div>

                        <div class="plan monthly">
                            <form method="POST" action="/signup">
                                <label class="visually-hidden" for="monthly-plan">Select Number of Runs per
                                    month</label>
                                <select id="monthly-plan" name="plan" class="plan-select" onchange="changePrice('monthly')">
                                    <?php foreach ($monthly_plans as $plan) : ?>
                                        <option value="<?= $plan->getId() ?>" data-price="<?= $plan->getMonthlyPrice() ?>" data-price-annual="<?= $plan->getAnnualPrice() ?>">
                                            <?= $plan->getRuns() ?> Runs/mo ($<?= $plan->getMonthlyPrice() ?>/Monthly)
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                                <div class="price">$
                                    <span><?= $monthly_plans[0]->getMonthlyPrice() ?></span>
                                    /<?= $monthly_plans[0]->getBillingFrequency() ?>
                                </div>
                                <input type="hidden" name="csrf_token" value="<?= $csrf_token ?>" />
                                <input type="hidden" name="auth_token" value="<?= $auth_token ?>" />
                                <input type="hidden" name="step" value="1" />
                                <button class="signup-button" type="submit">Select Plan</button>
                            </form>
                        </div>


                    </div>
                </th>

                <th scope="col" class="custom-plan">
                    <div class="plan-selector">
                        Custom Plans/Integrations?
                    </div>
                </th>
            </tr>
        </thead>

        <tbody>
            <tr>
                <th scope="col">Runs Included</th>
                <td>300</td>
                <td>Unlimited per plan</td>

                <td rowspan="17" class="custom-plan">
                    <a class="button signup-button" href="https://www.product.webpagetest.org/contact">Contact Us</a>
                </td>
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