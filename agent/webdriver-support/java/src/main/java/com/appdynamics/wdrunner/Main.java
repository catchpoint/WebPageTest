/*
 * Copyright (c) AppDynamics Inc
 * All rights reserved
 */
package com.appdynamics.wdrunner;

import com.appdynamics.wdrunner.wpt.HookAwareCommandExecutor;
import org.openqa.selenium.remote.RemoteWebDriver;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * @author <a mailto="karthik3186@gmail.com">Karthik Krishnamurthy</a>
 * @since 2/15/2015
 */
public class Main {
    private static final Logger LOG = LoggerFactory.getLogger(Main.class);

    public static void main(String[] args) {
        try {
            process(args);
        } catch (Exception e) {
            LOG.error(e.getMessage(), e);
        }
    }

    private static void process(String[] args) throws Exception {
        Config config = Config.buildConfig(args);
        LOG.info("Startup Configuration: {}", config.toString());

        WebBrowser browser = WebBrowser.valueOf(config.getBrowser());
        RemoteWebDriver driver = (RemoteWebDriver) browser.createHookAwareWebDriver(config);
        try {
            OnDemandWDRunner.run(driver, config.getScript());
        } finally {
            LOG.info("User script completed. Sending /event/webdriver_done to WptHook");
            // Let the hook know that we are done with the user script.
            ((HookAwareCommandExecutor) driver.getCommandExecutor()).getWptHookClient().webdriverDone();
        }
    }
}
