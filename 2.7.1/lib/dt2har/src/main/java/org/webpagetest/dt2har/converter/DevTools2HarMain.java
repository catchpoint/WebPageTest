/******************************************************************************
Copyright (c) 2012, Google Inc.
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright notice,
      this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright notice,
      this list of conditions and the following disclaimer in the documentation
      and/or other materials provided with the distribution.
    * Neither the name of Google, Inc. nor the names of its contributors
      may be used to endorse or promote products derived from this software
      without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
******************************************************************************/

package org.webpagetest.dt2har.converter;

import org.webpagetest.dt2har.protocol.DevtoolsMessageFactory;
import org.webpagetest.dt2har.protocol.MalformedDevtoolsMessageException;

import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.json.simple.parser.JSONParser;
import org.json.simple.parser.ParseException;

import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.io.Reader;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * A command line utility to convert Chrome Devtools event log to a HAR file.
 */
public class DevTools2HarMain {
  private static final Logger logger = Logger.getLogger(DevTools2HarMain.class.getName());

  private final String devToolsFilePath;
  private final String harFilePath;
  private final HarObject har = new HarObject();

  public DevTools2HarMain(final String[] args) {
    if (args.length != 2) {
      String usage = "Usage: devtools2har <devtools-log-file> <har-file>";
      throw new IllegalArgumentException(usage);
    }
    devToolsFilePath = args[0];
    harFilePath = args[1];
  }

  public void run() throws IOException, ParseException {
    Reader dtReader = new FileReader(new File(devToolsFilePath));
    DevtoolsMessageFactory factory = new DevtoolsMessageFactory();
    try {
      JSONParser dtParser = new JSONParser();
      JSONArray devToolsLog = (JSONArray) dtParser.parse(dtReader);
      for (Object devToolsMessage : devToolsLog) {
        try {
          har.addMessage(factory.decodeDevtoolsJson((JSONObject) devToolsMessage));
        } catch (MalformedDevtoolsMessageException e) {
          logger.log(Level.WARNING, "Ignoring unrecognized or malformed message: {0}", e);
        }
      }
    } finally {
      dtReader.close();
    }
    try {
      har.createHarFromMessages();
      har.save(harFilePath);
    } catch (HarConstructionException e) {
      logger.log(Level.SEVERE, "Couldn't construct har from input messages. {0}", e);
    }
  }

  /**
   * @param args
   */
  public static void main(final String[] args)
      throws IOException, ParseException {
    DevTools2HarMain dt2har = new DevTools2HarMain(args);
    dt2har.run();
  }

}
