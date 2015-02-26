package com.appdynamics.wdrunner.wpt;
/*
 * Copyright (c) AppDynamics Inc
 * All rights reserved
 */
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.common.io.CharStreams;

import java.io.IOException;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.MalformedURLException;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/**
 * @author <a mailto="karthik3186@gmail.com">Karthik Krishnamurthy</a>
 * @since 2/26/2015
 */
public class WptHookClient {
    private final URL hookReadyUrl;
    private final URL webdriverDoneUrl;
    private final ObjectMapper mapper = new ObjectMapper();

    public WptHookClient(String wptHookUrl) throws MalformedURLException {
        this.hookReadyUrl = new URL(wptHookUrl + "/is_hook_ready");
        this.webdriverDoneUrl = new URL(wptHookUrl + "/event/webdriver_done");
    }

    public boolean isHookReady() throws IOException {
        String response = getResponse(hookReadyUrl);
        HookReady readyObj = mapper.readValue(response, HookReady.class);
        return (readyObj != null && readyObj.data != null && readyObj.data.ready);
    }

    public void webdriverDone() throws IOException {
        getResponse(webdriverDoneUrl);
    }

    public static class HookReady {
        public int statusCode;
        public String statusText;
        public Data data;

        public class Data {
            public boolean ready;
        }
    }

    public static String getResponse(URL url) throws IOException {
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
        return CharStreams.toString(new InputStreamReader(connection.getInputStream(), StandardCharsets.UTF_8));
    }
}
