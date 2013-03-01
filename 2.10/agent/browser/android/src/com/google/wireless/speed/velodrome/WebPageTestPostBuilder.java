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
    * Neither the name of Google Inc. nor the names of its contributors
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

/**
 * Class WebPageTestPostBuilder gathers parameters to be sent to a WebPageTest
 * server URL in an http POST.
 *
 * There are several conventions used by other agents which this class
 * enforces:
 *  * All text is UTF8 encoded.
 *  * Boolean values are only set if they are true.
 *  * True boolean values are set to the string "1".
 *
 * This class makes the code that build the POST substantially more readable.
 * The content of the POST belongs in the user's code.  The mechanics of
 * encoding the contents as the server expects it belong in this class.
 */

package com.google.wireless.speed.velodrome;

import java.io.File;
import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.nio.charset.Charset;

import org.apache.http.HttpResponse;
import org.apache.http.HttpVersion;
import org.apache.http.client.HttpClient;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.mime.HttpMultipartMode;
import org.apache.http.entity.mime.MultipartEntity;
import org.apache.http.entity.mime.content.FileBody;
import org.apache.http.entity.mime.content.StringBody;
import org.apache.http.impl.client.ContentEncodingHttpClient;
import org.apache.http.params.CoreProtocolPNames;

public class WebPageTestPostBuilder {
  private static final String POST_CHAR_ENCODING = "UTF-8";
  private static final String POST_PARAM_MIME_TYPE = "text/plain";

  // There are many values that the PHP server code will parse as true.
  // Use the same string as other agents to avoid the possibility that changes
  // on the server side will break some agents, and not others.
  private static final String POST_TRUE_INTEGER_VALUE = "1";
  private static final String POST_FALSE_INTEGER_VALUE = "0";

  public WebPageTestPostBuilder() {
    mEntity = new MultipartEntity(HttpMultipartMode.BROWSER_COMPATIBLE);
    mCharset = Charset.forName(POST_CHAR_ENCODING);
  }

  public void addStringParam(String paramName, String value)
      throws UnsupportedEncodingException {
    addParamImpl(paramName, value);
  }

  public void addFileContents(String paramName,
                              String fileName,
                              File filePath,
                              String mimeType) {
    mEntity.addPart(paramName,
                    new FileBody(filePath, fileName, mimeType, POST_CHAR_ENCODING));
  }

  // If |value| is true, send a value PHP will treat as true.
  // If |value| is false, do not send the parameter.
  public void addBooleanParamIfTrue(String paramName, boolean value)
      throws UnsupportedEncodingException {
    // Only set boolean values that are true.  Server assumes that unset values
    // are false.
    if (value)
      addParamImpl(paramName, POST_TRUE_INTEGER_VALUE);
  }

  // Send a boolean value.  Send the param and a value in all cases.
  // Use addBooleanParamIfTrue() if possible, so that the POST will be
  // smaller (and $_REQUEST[] easier to read) if the server allows it.
  // This method is for parameters that the server insists are set.
  public void addBooleanParamAlways(String paramName, boolean value)
      throws UnsupportedEncodingException {
    addParamImpl(paramName, (value ? POST_TRUE_INTEGER_VALUE
                                   : POST_FALSE_INTEGER_VALUE));
  }

  public void addIntegerParam(String paramName, int value)
      throws UnsupportedEncodingException {
    addParamImpl(paramName, Integer.toString(value));
  }

  public HttpResponse doPost(String url) throws IOException {
    HttpClient client = new ContentEncodingHttpClient();
    client.getParams().setParameter(CoreProtocolPNames.PROTOCOL_VERSION,
                                    HttpVersion.HTTP_1_1);

    HttpPost post = new HttpPost(url);
    post.setEntity(mEntity);
    HttpResponse httpResponse = client.execute(post);

    return httpResponse;
  }

  /**
   * Most public add*() methods end up calling this method
   * to add data in string form.
   */
  private void addParamImpl(String paramName, String value)
      throws UnsupportedEncodingException {
    mEntity.addPart(
        paramName,
        new StringBody(
            value,
            POST_PARAM_MIME_TYPE,
            mCharset));
  }

  private MultipartEntity mEntity;
  private Charset mCharset;
}
