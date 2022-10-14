<aside>
    <h3>Selected Plan</h3>
    <div class="plan-name">
        <?= $is_plan_free ? "STARTER" : '<div class="heading wpt-pro-logo"> <span class="visually-hidden">WebPageTest <em class="new-banner">Pro</em></span></div>' ?>
    </div>
    <div class="plan-details">
        <table>
            <?php if (!$is_plan_free) : ?>
            <tr>
                <th>Pay Plan:</th>
                <td><?= $billing_frequency ?></td>
            </tr>
            <?php endif; ?>
            <tr>
                <th>Runs/mo:</th>
                <td><?= $runs ?? 300; ?></td>
            </tr>
            <tr>
                <th>Price:</th>
                <?php if ($is_plan_free) : ?>
                    <td>Free</td>
                <?php else : ?>
                    <?php if ($billing_frequency == "Monthly") : ?>
                        <td>$<?= "{$monthly_price}/mo" ?></td>
                    <?php else : ?>
                        <td><s>$<?= $other_annual ?></s> $<?= "{$annual_price}/yr" ?></td>
                    <?php endif; ?>
                <?php endif; ?>
            </tr>
            <tr>
                <th>Estimated Taxes</th>
                <td><?= $estimated_tax ?? "--" ?></td>
            </tr>
            <tr>
                <th>Total including tax</th>
                <td><?= $total_including_tax ?? "--" ?></td>
            </tr>
            </tbody>
        </table>
    </div> <!-- /.plan-details -->
    <div class="plan-benefits">
        <h4>Plan Benefits</h4>
        <?php if ($is_plan_free) : ?>
            <ul>
                <li>Access to real browsers in real locations around the world, always running the latest versions.</li>
                <li>Testing on real connection speeds with gold-standard, accurate throttling.</li>
                <li>Custom scripting to let you interact with the page or script user journey flows.</li>
                <li>Access to test history for 13 months to allow for easy comparisons and over time.</li>
                <li>Opportunities report [NEW] to help you zero in on ways to improve the overall effectiveness of your websites.</li>
            </ul>
        <?php else : ?>
            <ul>
                <li>Everything in the Starter plan, including real browsers in real locations, custom scripting for page level and user journey measurements, access to 13 months of test history, and the all new Opportunities report to help you zero in on areas of improvement. </li>
                <li>Access to all new no-code Experiments </li>
                <li>API access for easier integration into your CI/CD, visualizations, alerting and more </li>
                <li>High priority tests to help you jump the queue and experience lower wait times </li>
                <li>Access to new and exclusive, premium-only, test locations </li>
                <li>Dedicated support to help you get back to work faster </li>
                <li>Bulk testing to enable testing of many pages at once </li>
                <li>Private tests for ensuring your private test results stay that way</li>
            </ul>
        <?php endif; ?>
    </div> <!-- /.plan-benefits -->
</aside>
