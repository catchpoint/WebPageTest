/*
 * Copyright (c) AppDynamics Inc
 * All rights reserved
 */
package com.appdynamics.wdrunner.wpt;

import org.openqa.selenium.remote.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;

/**
 * @author <a mailto="karthik3186@gmail.com">Karthik Krishnamurthy</a>
 * @since 2/14/2015
 */
public class HookAwareCommandExecutor implements CommandExecutor {
    private static final Logger LOG = LoggerFactory.getLogger(HookAwareCommandExecutor.class);

    private final CommandExecutor delegate;
    private final WptHookClient wptHookClient;

    public HookAwareCommandExecutor(WptHookClient wptHookClient, CommandExecutor delegate) {
        this.wptHookClient = wptHookClient;
        this.delegate = delegate;
    }

    @Override
    public Response execute(Command command) throws IOException {
        if (command.getName().equals(DriverCommand.QUIT) || command.getName().equals(DriverCommand.CLOSE)) {
            // Quit and Close is not allowed from user script!
            throw new RuntimeException("User script is not allowed to execute '" + command.getName() + "' command.");
        } else if (!command.getName().equals(DriverCommand.NEW_SESSION)) {
            // Check if the Wpt Hook is ready before executing the command.
            waitUntilHookReady();
        }
        // else, this is the NEW_SESSION command which spawns the browser in the first place. So, checking with the
        // hook doesn't make sense. Allow the command to go through.
        LOG.info("Executing driver command: {}", command.toString());
        return delegate.execute(command);
    }

    public WptHookClient getWptHookClient() {
        return wptHookClient;
    }

    private void waitUntilHookReady() {
        while (true) {
            LOG.info("Waiting for WptHook to be ready...");
            try {
                if (wptHookClient.isHookReady()) {
                    break;
                }
                Thread.sleep(1000);
            } catch (IOException e) {
                LOG.error("Unable to get response for 'is_hook_ready' request!");
                throw new RuntimeException("Cannot reach WptHook", e);
            } catch (InterruptedException e) {
                throw new RuntimeException("Wait interrupted. Exiting...");
            }
        }
    }
}
