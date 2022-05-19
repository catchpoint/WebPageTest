<div class="signup-hed-contain">
      <div class="signup-hed ">
          <h1>Sign up</h1>
      </div> <!-- ./signup-hed -->
  </div>

  <div class="signup-step-1-content">
      <!-- css only tabs. The html is in this order for a reason. -->
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
                              <p class="plan-name">API Subscription</p>
                              <div class="plan annual">
                                  <label class="visually-hidden" for="annual-plan">Select Number of Runs per
                                      month</label>
                                  <select name="plan" id="annual-plan" class="plan-select"
                                      onchange="changePrice('annual')">
                                      <?php foreach ($annual_plans as $plan) : ?>
                                      <option value="<?= $plan->getId() ?>" data-price="<?= $plan->getAnnualPrice() ?>"
                                          data-price-monthly="<?= $plan->getMonthlyPrice() ?>">
                                          <?= $plan->getRuns() ?> Runs/mo
                                          ($<?= $plan->getAnnualPrice() ?>/<?= $plan->getBillingFrequency() ?>)</option>
                                      <?php endforeach; ?>
                                  </select>
                                  <div class="price">
                                      $<span><?= $annual_plans[0]->getAnnualPrice() ?></span>
                                      /<?= $annual_plans[0]->getBillingFrequency() ?>
                                  </div>
                              </div>

                              <div class="plan monthly">
                                  <label class="visually-hidden" for="monthly-plan">Select Number of Runs per
                                      month</label>
                                  <select id="monthly-plan" name="plan" class="plan-select"
                                      onchange="changePrice('monthly')">
                                      <?php foreach ($monthly_plans as $plan) : ?>
                                      <option value="<?= $plan->getId() ?>" data-price="<?= $plan->getMonthlyPrice() ?>"
                                          data-price-annual="<?= $plan->getAnnualPrice() ?>">
                                          <?= $plan->getRuns() ?> Runs/mo ($<?= $plan->getMonthlyPrice() ?>/Monthly)
                                      </option>
                                      <?php endforeach; ?>
                                  </select>
                                  <div class="price">$
                                      <span><?= $monthly_plans[0]->getMonthlyPrice() ?></span>
                                      /<?= $monthly_plans[0]->getBillingFrequency() ?>
                                  </div>
                              </div>
                              <input type="hidden" name="csrf_token" value="<?= $csrf_token ?>" />
                              <input type="hidden" name="auth_token" value="<?= $auth_token ?>" />
                              <input type="hidden" name="step" value="1" />
                              <button class="signup-button" type="submit">Select Plan</button>
                          </form>
                      </div>
                  </th>
                  <th scope="col">
                      <div class="plan-selector">
                          <form method="POST" action="/signup">
                              <p class="plan-name">Free Account</p>
                              <div class="runs">Unlimited</div>
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
                  <th scope="col">Locations</th>
                  <td>30</td>
                  <td>30</td>
                  <td rowspan="17" class="custom-plan">
                      <a class="button signup-button" href="mailto:support@webpagetest.org">Contact Us</a>
                  </td>
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

  </div><!-- /.signup-step-1-content -->