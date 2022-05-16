<div class="signup-hed-contain">
    <div class="signup-hed ">
        <h1>Ready to go <span>Pro?</span></h1>
        <p>All the WebPageTest features you already love</p>
        <p><strong>plus API Access &amp; unlimited 1-click experiments!</strong></p>
        <p class="plan-callout">Plans start at just <span class="signup-hed-price">$5/mo</span></p>
    </div> <!-- ./signup-hed -->
</div>

<div class="signup-step-1-content">
    <h2> Save 25% by paying annually!</h2>
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
                <th scope="col" class="custom-plan">
                    <div class="plan-selector">
                        Looking to run more than 20k runs a month, custom integrations or have additional questions?
                    </div>
                </th>
            </tr>
        </thead>

        <tbody>
            <tr>
                <th scope="col">Runs Included</th>
                <td>Unlimted per plan</td>
                <td>300</td>
                <td rowspan="17" class="custom-plan">
                    <a class="button signup-button" href="mailto:support@webpagetest.org">Contact Us</a>
                </td>
            </tr>

            <tr>
                <th scope="col">Locations</th>
                <td>40 <sup><a href="#fn1" id="ref1">*</a></sup></td>
                <td>30</td>
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
                    <i class="icon check" aria-hidden="true"></i>
                    <span class="visually-hidden">Yes</span>
                </td>
                <td>
                    <i class="icon x-in-circle-temp" aria-hidden="true"></i>
                    <span class="visually-hidden">No</span>
                </td>
            </tr>

            <tr>
                <th scope="col">Priority Tests</th>
                <td>
                    <i class="icon check" aria-hidden="true"></i>
                    <span class="visually-hidden">Yes</span>
                </td>
                <td>
                    <i class="icon x-in-circle-temp" aria-hidden="true"></i>
                    <span class="visually-hidden">No</span>
                </td>
            </tr>


            <tr>
                <th scope="col">API Access</th>
                <td>
                    <i class="icon check" aria-hidden="true"></i>
                    <span class="visually-hidden">Yes</span>
                </td>
                <td>
                    <i class="icon x-in-circle-temp" aria-hidden="true"></i>
                    <span class="visually-hidden">No</span>
                </td>
            </tr>

            <tr>
                <th scope="col">Integrations</th>
                <td>
                    <i class="icon check" aria-hidden="true"></i>
                    <span class="visually-hidden">Yes</span>
                </td>
                <td>
                    <i class="icon x-in-circle-temp" aria-hidden="true"></i>
                    <span class="visually-hidden">No</span>
                </td>
            </tr>

            <tr>
                <th scope="col">Private Tests <em class="new-banner">NEW</em></th>
                <td>
                    <i class="icon check" aria-hidden="true"></i>
                    <span class="visually-hidden">Yes</span>
                </td>
                <td>
                    <i class="icon x-in-circle-temp" aria-hidden="true"></i>
                    <span class="visually-hidden">No</span>
                </td>
            </tr>

            <tr>
                <th scope="col">Bulk Testing <em class="new-banner">NEW</em></th>
                <td>
                    <i class="icon check" aria-hidden="true"></i>
                    <span class="visually-hidden">Yes</span>
                </td>
                <td>
                    <i class="icon x-in-circle-temp" aria-hidden="true"></i>
                    <span class="visually-hidden">No</span>
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
                <th scope="col">Experiments</th>
                <td>
                    <i class="icon check" aria-hidden="true"></i>
                    <span class="visually-hidden">Yes</span>
                </td>
                <td>
                    <i class="icon x-in-circle-temp" aria-hidden="true"></i>
                    <span class="visually-hidden">No</span>
                </td>

            <tr>
                <th scope="col">Dedicated Support</th>
                <td>
                    <i class="icon check" aria-hidden="true"></i>
                    <span class="visually-hidden">Yes</span>
                </td>
                <td>
                    <i class="icon x-in-circle-temp" aria-hidden="true"></i>
                    <span class="visually-hidden">No</span>
                </td>
            </tr>

            <tr class="custom-plan-mobile">
                <th>Looking to run more than 20k runs a month, custom integrations or have additional questions?</th>

                <td style="border:none">
                    <a class="button signup-button" href="mailto:support@webpagetest.org">Contact Us</a>
                </td>
            </tr>

        </tbody>
    </table>
    <p><sup id="fn1">* Our list of available test locations is continually growing.</sup></p>

    <div class="FAQ">
        <h3>What's included in WebPageTest Pro?</h3>
        <dl class="faq">
            <dt>
                <button type="button" aria-expanded="false" aria-controls="faq1_desc">Lorem ipsum dolor sit
                    amet?</button>
            </dt>
            <dd>
                <div id="faq1_desc" class="desc">
                    <p>One morning, when Gregor Samsa woke from troubled dreams, he found himself transformed in his
                        bed into a
                        horrible vermin. He lay on his armour-like back, and if he lifted his head a little he could
                        see his brown
                        belly, slightly domed and divided by arches into stiff sections. The bedding was hardly able
                        to cover it
                        and seemed ready to slide off any moment. His many legs, pitifully thin compared with the size
                        of the rest
                        of him, waved about helplessly as he looked. "What's happened to me?" he thought. It wasn't a
                        dream. His
                        room, a proper human room although a little too small, lay peacefully between its four
                        familiar walls. A
                        collection of textile samples lay spread out on the table - Samsa was a travelling salesman -
                        and above it
                        there hung a picture that he had recently cut out of an illustrated magazine and housed in a
                        nice, gilded
                        frame. It showed a lady fitted out with a fur hat and fur boa who sat upright, raising a heavy
                        fur muff
                        that covered the whole of her lower arm towards the viewer. Gregor then turned to look out the
                        window at
                        the dull weather. Drops</p>
                </div>
            </dd>
            <dt>
                <button type="button" aria-expanded="false" aria-controls="faq2_desc">Lorem ipsum dolor sit amet,
                    consectetuer
                    adipiscing?</button>
            </dt>
            <dd>
                <div id="faq2_desc" class="desc">You should come to the Parking office and report the
                    <p>One morning, when Gregor Samsa woke from troubled dreams, he found himself transformed in his
                        bed into a
                        horrible vermin. He lay on his armour-like back, and if he lifted his head a little he could
                        see his brown
                        belly, slightly domed and divided by arches into stiff sections. The bedding was hardly able
                        to cover it
                        and seemed ready to slide off any moment. His many legs, pitifully thin compared with the size
                        of the rest
                        of him, waved about helplessly as he looked. "What's happened to me?" he thought. It wasn't a
                        dream. His
                        room, a proper human room although a little too small, lay peacefully between its four
                        familiar walls. A
                        collection of textile samples lay spread out on the table - Samsa was a travelling salesman -
                        and above it
                        there hung a picture that he had recently cut out of an illustrated magazine and housed in a
                        nice, gilded
                        frame. It showed a lady fitted out with a fur hat and fur boa who sat upright, raising a heavy
                        fur muff
                        that covered the whole of her lower arm towards the viewer. Gregor then turned to look out the
                        window at
                        the dull weather. Drops of rain could be heard hitting the pane, which made him feel quite
                        sad. "How about
                        if I sleep a little bit longer and forget all this nonsense", he thought, but that was
                        something he was
                        unable to do because he was used to sleeping on his right, and in his present state couldn't
                        get into that
                        position. However hard he threw himself onto his right, he always rolled back to where he was.
                        He must
                        have tried it a hundred times, shut his eyes so that he wouldn't have to look at the
                        floundering legs, and
                        only stopped when</p>
                </div>
            </dd>
            <dt>
                <button type="button" aria-expanded="false" aria-controls="faq3_desc">ipsum dolor sit?</button>
            </dt>
            <dd>
                <div id="faq3_desc" class="desc">
                    <p>One morning, when Gregor Samsa woke from troubled dreams, he found himself transformed in his
                        bed into a
                        horrible vermin. He lay on his armour-like back, and if he lifted his head a little he could
                        see his brown
                        belly, slightly domed and divided by arches into stiff sections. The</p>
                </div>
            </dd>
            <dt>
                <button type="button" aria-expanded="false" aria-controls="faq4_desc">Lorem ipsum dolor sit amet,
                    consectetuer?</button>
            </dt>
            <dd>
                <div id="faq4_desc" class="desc">
                    <p>One morning, when Gregor Samsa woke from troubled dreams, he found himself transformed in his
                        bed into a
                        horrible vermin. He lay on his armour-like back, and if he lifted his head a little he could
                        see his brown
                        belly, slightly domed and divided by arches into stiff sections. The bedding was hardly able
                        to cover it
                        and seemed ready to slide off any moment. His many legs, pitifully thin</p>
                </div>
            </dd>
        </dl>

    </div> <!-- ./faq-->


</div><!-- /.signup-step-1-content -->