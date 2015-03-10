/*
 * Copyright (c) AppDynamics Inc
 * All rights reserved
 */
package com.appdynamics.wdrunner;

import com.google.common.base.Joiner;
import com.google.common.base.Optional;
import com.google.common.io.Files;
import org.apache.commons.cli.*;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.firefox.FirefoxDriver;
import org.openqa.selenium.remote.RemoteWebDriver;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.stringtemplate.v4.ST;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.StringTokenizer;

/**
 * @author <a mailto="karthik3186@gmail.com">Karthik Krishnamurthy</a>
 * @since 2/15/2015
 */
public class Config {
    public static final String DEFAULT_CONFIG_FILE = System.getenv("APPDATA") + "\\webpagetest_data\\test.dat";
    private static final ST URL_GET_TEMPLATE = new ST("driver.get(\"<url>\");");
    private static final Logger LOG = LoggerFactory.getLogger(Main.class);

    private static final Options options = new Options()
        .addOption(
            OptionBuilder.hasArg().isRequired()
                .withLongOpt("test-id")
                .withDescription("unique test ID")
                .create("testId")
        )
        .addOption(
            OptionBuilder.hasArg().isRequired()
                .withLongOpt("test-config")
                .withDescription("path to the test config file")
                .create("testConfig")
        )
        .addOption(
            OptionBuilder.hasArg().isRequired()
                .withLongOpt("browser")
                .withDescription("browser on which the test should be run")
                .create("browser")
        )
        .addOption(
            OptionBuilder.hasArg()
                .withLongOpt("test-url")
                .withDescription("single url to test")
                .create("testUrl")
        );

    private final String browser;
    private final String[] browserArgs;
    private final String wptHookUrl;
    private final String webdriverUrl;
    private final String testConfigFile;
    private final String testId;
    private final Optional<String> testUrl;

    public Config(String browser, String[] browserArgs, String wptHookUrl, String webdriverUrl, String testConfigFile,
            String testId, Optional<String> testUrl) {
        this.browser = browser;
        this.browserArgs = browserArgs;
        this.wptHookUrl = wptHookUrl;
        this.webdriverUrl = webdriverUrl;
        this.testConfigFile = testConfigFile;
        this.testId = testId;
        this.testUrl = testUrl;
    }

    public String getBrowser() {
        return browser;
    }

    public String[] getBrowserArgs() {
        return browserArgs;
    }

    public String getWptHookUrl() {
        return wptHookUrl;
    }

    public String getWebdriverUrl() {
        return webdriverUrl;
    }

    public String getTestConfigFile() {
        return testConfigFile;
    }

    public String getTestId() {
        return testId;
    }

    public Optional<String> getTestUrl() {
        return testUrl;
    }

    @Override
    public String toString() {
        String lineSeparator = System.lineSeparator();
        String template = "{" + lineSeparator +
            "  browser: %s," + lineSeparator +
            "  browserArgs: %s" + lineSeparator +
            "  wptHookUrl: %s," + lineSeparator +
            "  webdriverUrl: %s," + lineSeparator +
            "  testConfigFile: %s," + lineSeparator +
            "  testId: %s," + lineSeparator +
            "}";

        return String.format(template,
            browser,
            Joiner.on("|").join(browserArgs),
            wptHookUrl,
            webdriverUrl,
            testConfigFile,
            testId);

    }

    @SuppressWarnings("unchecked")
    public static Config buildConfig(String[] args) throws ParseException {
        CommandLine commandLine;
        try {
            commandLine = new BasicParser().parse(options, args);
        } catch (ParseException e) {
            LOG.error("Failed to parse command line arguments: {}", Joiner.on(' ').join(args));
            printUsage();
            throw e;
        }
        if (commandLine.hasOption("server")) {
            if (commandLine.hasOption("session-id") || commandLine.hasOption("test-config")) {
                throw new ParseException("--server is mutually exclusive with --test-config and --session-id");
            }
        } else {
            if (!commandLine.hasOption("test-config") && !commandLine.hasOption("test-url")) {
                throw new ParseException("One of --test-config or --test-url must be specified when running in client" +
                    " mode");
            }
        }
        List<String> browserArgs = commandLine.getArgList();
        ConfigBuilder builder =  new ConfigBuilder()
            .withBrowser(commandLine.getOptionValue("browser", WebBrowser.CHROME.name()))
            .withBrowserArgs(browserArgs.toArray(new String[browserArgs.size()]))
            .withTestConfigFile(commandLine.getOptionValue("testConfig", DEFAULT_CONFIG_FILE))
            .withTestId(commandLine.getOptionValue("testId"));

        if (commandLine.hasOption("testUrl")) {
            builder.withTestUrl(commandLine.getOptionValue('u'));
        }
        return builder.build();
    }

    public static class ConfigBuilder {
        private String browser;
        private String[] browserArgs;
        private String wptHookUrl = "http://localhost:8888";
        private String webdriverUrl = "http://localhost:4444/wd/hub";
        private String testConfigFile;
        private String testId;
        private Optional<String> testUrl = Optional.<String>absent();

        public ConfigBuilder withBrowser(String browser) {
            this.browser = browser.toUpperCase();
            return this;
        }

        public ConfigBuilder withBrowserArgs(String[] browserArgs) {
            this.browserArgs = browserArgs;
            return this;
        }

        public ConfigBuilder withWptHookUrl(String wptHookUrl) {
            this.wptHookUrl = wptHookUrl;
            return this;
        }

        public ConfigBuilder withWebdriverUrl(String webdriverUrl) {
            this.webdriverUrl = webdriverUrl;
            return this;
        }

        public ConfigBuilder withTestId(String testId) {
            this.testId = testId;
            return this;
        }

        public ConfigBuilder withTestConfigFile(String testConfigFile) {
            this.testConfigFile = testConfigFile;
            return this;
        }

        public ConfigBuilder withTestUrl(String testUrl) {
            if (!testUrl.contains("://")) {
                testUrl = "http://" + testUrl;
            }
            this.testUrl = Optional.of(testUrl);
            return this;
        }

        public Config build() {
            return new Config(browser, browserArgs, wptHookUrl, webdriverUrl, testConfigFile, testId, testUrl);
        }
    }

    public String getScript() throws IOException {
        if (testUrl.isPresent()) {
            return URL_GET_TEMPLATE.add("url", testUrl.get()).render();
        } else {
            StringBuilder script = new StringBuilder();
            String testData = Files.toString(new File(testConfigFile), StandardCharsets.UTF_16LE);
            StringTokenizer tokenizer = new StringTokenizer(testData, "\r\n");
            boolean foundScript = false;
            while (tokenizer.hasMoreTokens()) {
                String line = tokenizer.nextElement().toString();
                if (foundScript) {
                    script.append(line).append("\r\n");
                } else if (line.equals("[Script]")) {
                    foundScript = true;
                }
            }
            return script.toString();
        }
    }

    private static void printUsage() {
        new HelpFormatter().printHelp(
            "webdriver-runner-all.jar [OPTIONS] [browser args]", "OPTIONS", options, ""
        );
    }
}