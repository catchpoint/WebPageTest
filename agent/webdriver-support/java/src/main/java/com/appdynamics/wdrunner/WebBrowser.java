/*
 * Copyright (c) AppDynamics Inc
 * All rights reserved
 */
package com.appdynamics.wdrunner;

import com.appdynamics.wdrunner.wpt.HookAwareCommandExecutor;
import com.appdynamics.wdrunner.wpt.WptHookClient;
import org.openqa.selenium.Capabilities;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.firefox.FirefoxDriver;
import org.openqa.selenium.firefox.FirefoxProfile;
import org.openqa.selenium.remote.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;
import java.net.MalformedURLException;
import java.net.URL;

/**
 * @author <a mailto="karthik3186@gmail.com">Karthik Krishnamurthy</a>
 * @since 2/14/2015
 */
public enum WebBrowser {
    CHROME,
    FIREFOX;

    private static final int MAX_WEBDRIVER_CREATE_ATTEMPTS = 10;
    private static final Logger LOG = LoggerFactory.getLogger(WebBrowser.class);

    private Capabilities getCapabilities(Config config) {
        switch (this) {
            case CHROME:
                return getChromeCapabilities(config);

            case FIREFOX:
                return getFirefoxCapabilities(config);

            default:
                throw new IllegalArgumentException("Unknown Browser!");
        }
    }

    private Capabilities getFirefoxCapabilities(Config config) {
        DesiredCapabilities capabilities = DesiredCapabilities.firefox();
        FirefoxProfile profile = new FirefoxProfile(new File(config.getProfileDir().get()));
        capabilities.setCapability(FirefoxDriver.PROFILE, profile);
        return capabilities;
    }

    private Capabilities getChromeCapabilities(Config config) {
        DesiredCapabilities capabilities = DesiredCapabilities.chrome();
        ChromeOptions options = new ChromeOptions();
        for (String arg : config.getBrowserArgs()) {
            options.addArguments(arg);
        }
        capabilities.setCapability(ChromeOptions.CAPABILITY, options);
        return capabilities;
    }

    private CommandExecutor createCommandExecutor(Config config) throws MalformedURLException {
        WptHookClient wptHookClient = new WptHookClient(config.getWptHookUrl());
        HttpCommandExecutor executor = new HttpCommandExecutor(new URL(config.getWebdriverUrl()));
        return new HookAwareCommandExecutor(wptHookClient, executor);
    }

    public WebDriver createHookAwareWebDriver(Config config) throws MalformedURLException {
        Capabilities capabilities = getCapabilities(config);
        CommandExecutor executor = createCommandExecutor(config);
        UnreachableBrowserException exception = null;
        int attempts;
        for (attempts = 0; attempts < MAX_WEBDRIVER_CREATE_ATTEMPTS; attempts++) {
            try {
                return new RemoteWebDriver(executor, capabilities);
            } catch (UnreachableBrowserException e) {
                LOG.warn("Attempt #{}: Failed to create a remote webdriver instance. Retrying..", attempts);
                exception = e;
            }
            try {
                Thread.sleep(100);
            } catch (InterruptedException e) {
                break;
            }
        }
        LOG.error("After {} attempts, cannot create a webdriver instance. Aborting...", attempts);
        throw exception;
    }
}
