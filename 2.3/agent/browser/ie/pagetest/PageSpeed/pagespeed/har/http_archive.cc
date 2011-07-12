// Copyright 2010 Google Inc. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

#include "pagespeed/har/http_archive.h"

#include <ctype.h>  // for isdigit
#include <stdio.h>  // for sscanf

#include "base/basictypes.h"
#include "base/logging.h"
#include "base/string_util.h"
#include "base/third_party/nspr/prtime.h"
#include "pagespeed/core/pagespeed_input.h"
#include "third_party/cJSON/cJSON.h"
#include "third_party/modp_b64/modp_b64.h"

namespace pagespeed {

namespace {

class InputPopulator {
 public:
  static bool Populate(cJSON* har_json, PagespeedInput* input);

 private:
  enum HeaderType { REQUEST_HEADERS, RESPONSE_HEADERS };

  InputPopulator() : error_(false), page_finished_millis_(-1) {}
  ~InputPopulator() {}

  void PopulateInput(cJSON* har_json, PagespeedInput* input);
  void DeterminePageFinishedMillis(cJSON* log_json);
  void PopulateResource(cJSON* entry_json, Resource* resource);
  void PopulateHeaders(cJSON* headers_json, HeaderType htype,
                       Resource* resource);
  int GetInt(cJSON *object, const char* key);
  const std::string GetString(cJSON *object, const char* key);

  bool error_;
  int64 page_finished_millis_;

  DISALLOW_COPY_AND_ASSIGN(InputPopulator);
};

bool InputPopulator::Populate(cJSON* har_json, PagespeedInput* input) {
  InputPopulator populator;
  populator.PopulateInput(har_json, input);
  return !populator.error_;
}

// Macro to be used only within InputPopulator instance methods:
#define INPUT_POPULATOR_ERROR() ((error_ = true), LOG(ERROR))

void InputPopulator::PopulateInput(cJSON* har_json, PagespeedInput* input) {
  if (har_json->type != cJSON_Object) {
    INPUT_POPULATOR_ERROR() << "Top-level JSON value must be an object.";
    return;
  }

  cJSON* log_json = cJSON_GetObjectItem(har_json, "log");
  if (log_json == NULL || log_json->type != cJSON_Object) {
    INPUT_POPULATOR_ERROR() << "\"log\" field must be an object.";
    return;
  }

  DeterminePageFinishedMillis(log_json);

  cJSON* entries_json = cJSON_GetObjectItem(log_json, "entries");
  if (entries_json == NULL || entries_json->type != cJSON_Array) {
    INPUT_POPULATOR_ERROR() << "\"entries\" field must be an array.";
    return;
  }

  for (cJSON* entry_json = entries_json->child;
       entry_json != NULL; entry_json = entry_json->next) {
    Resource* resource = new Resource;
    PopulateResource(entry_json, resource);
    if (error_) {
      delete resource;
    } else {
      input->AddResource(resource);
    }
  }
}

void InputPopulator::DeterminePageFinishedMillis(cJSON* log_json) {
  cJSON* pages_json = cJSON_GetObjectItem(log_json, "pages");
  if (pages_json == NULL || pages_json->type != cJSON_Array) {
    // The "pages" field is optional, so give up without error if it's not
    // there.
    return;
  }

  // For now, just take the first page (if any), and ignore others.
  // TODO(mdsteele): Behave intelligently in the face of multiple pages.
  cJSON* page_json = pages_json->child;
  if (page_json == NULL) {
    return;
  } else if (page_json->type != cJSON_Object) {
    INPUT_POPULATOR_ERROR() << "Page item must be an object.";
    return;
  }

  cJSON* timing_json = cJSON_GetObjectItem(page_json, "pageTimings");
  if (timing_json == NULL || timing_json->type != cJSON_Object) {
    INPUT_POPULATOR_ERROR() << "\"pageTimings\" field must be an object.";
    return;
  }

  cJSON* onload_json = cJSON_GetObjectItem(timing_json, "onLoad");
  if (onload_json != NULL && onload_json->type == cJSON_Number) {
    const std::string started_datetime =
        GetString(page_json, "startedDateTime");
    int64 started_millis;
    if (Iso8601ToEpochMillis(started_datetime, &started_millis)) {
      const int64 onload_millis = static_cast<int64>(onload_json->valueint);
      if (onload_millis >= 0) {
        page_finished_millis_ = started_millis + onload_millis;
      }
    } else {
      LOG(DFATAL) << "Failed to parse ISO 8601: " << started_datetime;
    }
  }
}

void InputPopulator::PopulateResource(cJSON* entry_json, Resource* resource) {
  if (entry_json->type != cJSON_Object) {
    INPUT_POPULATOR_ERROR() << "Entry item must be an object.";
    return;
  }

  // Determine if the resource was lazy-loaded.
  {
    cJSON* started_json = cJSON_GetObjectItem(entry_json, "startedDateTime");
    if (started_json != NULL && started_json->type == cJSON_String) {
      int64 started_millis;
      if (Iso8601ToEpochMillis(started_json->valuestring, &started_millis)) {
        if (started_millis > page_finished_millis_) {
          resource->SetLazyLoaded();
        }
      } else {
        LOG(DFATAL) << "Failed to parse ISO 8601: "
                    << started_json->valuestring;
      }
    }
  }

  // Get the request information.
  {
    cJSON* request_json = cJSON_GetObjectItem(entry_json, "request");
    if (request_json == NULL || request_json->type != cJSON_Object) {
      INPUT_POPULATOR_ERROR() << "\"request\" field must be an object.";
      return;
    }

    resource->SetRequestMethod(GetString(request_json, "method"));
    resource->SetRequestUrl(GetString(request_json, "url"));
    PopulateHeaders(cJSON_GetObjectItem(request_json, "headers"),
                    REQUEST_HEADERS, resource);

    // Check for optional post data.
    cJSON* post_json = cJSON_GetObjectItem(request_json, "postData");
    if (post_json != NULL) {
      if (request_json->type != cJSON_Object) {
        INPUT_POPULATOR_ERROR() << "\"postData\" field must be an object.";
      } else {
        resource->SetRequestBody(GetString(post_json, "text"));
      }
    }
  }

  // Get the response information.
  {
    cJSON* response_json = cJSON_GetObjectItem(entry_json, "response");
    if (response_json == NULL || response_json->type != cJSON_Object) {
      INPUT_POPULATOR_ERROR() << "\"response\" field must be an object.";
      return;
    }

    resource->SetResponseStatusCode(GetInt(response_json, "status"));
    PopulateHeaders(cJSON_GetObjectItem(response_json, "headers"),
                    RESPONSE_HEADERS, resource);

    cJSON* content_json = cJSON_GetObjectItem(response_json, "content");
    if (response_json == NULL || response_json->type != cJSON_Object) {
      INPUT_POPULATOR_ERROR() << "\"content\" field must be an object.";
    } else {
      cJSON* content_text_json = cJSON_GetObjectItem(content_json, "text");
      if (content_text_json != NULL) {
        if (content_text_json->type != cJSON_String) {
          INPUT_POPULATOR_ERROR() << "\"text\" field must be a string.";
        } else {
          cJSON* content_text_encoding =
              cJSON_GetObjectItem(content_json, "encoding");
          if (content_text_encoding != NULL) {
            if (content_text_encoding->type != cJSON_String) {
              INPUT_POPULATOR_ERROR() << "\"encoding\" field must be a string.";
            } else {
              if (strcmp(content_text_encoding->valuestring, "base64") != 0) {
                INPUT_POPULATOR_ERROR() << "Received unexpected encoding: "
                                        << content_text_encoding->valuestring;
              } else {
                const char* encoded_body = content_text_json->valuestring;
                const size_t encoded_body_len = strlen(encoded_body);
                std::string decoded_body;

                // Reserve enough space to decode into.
                decoded_body.resize(modp_b64_decode_len(encoded_body_len));

                // Decode into the string's buffer.
                int decoded_size = modp_b64_decode(&(decoded_body[0]),
                                                   encoded_body,
                                                   encoded_body_len);

                if (decoded_size >= 0) {
                  // Resize the buffer to the actual decoded size.
                  decoded_body.resize(decoded_size);
                  resource->SetResponseBody(decoded_body);
                } else {
                  INPUT_POPULATOR_ERROR()
                      << "Failed to base64-decode response content.";
                }
              }
            }
          } else {
            resource->SetResponseBody(content_text_json->valuestring);
          }
        }
      }
    }
  }
}

void InputPopulator::PopulateHeaders(cJSON* headers_json, HeaderType htype,
                                     Resource* resource) {
  if (headers_json == NULL || headers_json->type != cJSON_Array) {
    INPUT_POPULATOR_ERROR() << "\"headers\" field must be an array.";
    return;
  }

  for (cJSON* header_json = headers_json->child;
       header_json != NULL; header_json = header_json->next) {
    if (header_json->type != cJSON_Object) {
      INPUT_POPULATOR_ERROR() << "Header item must be an object.";
      continue;
    }

    const std::string name = GetString(header_json, "name");
    const std::string value = GetString(header_json, "value");

    switch (htype) {
      case REQUEST_HEADERS:
        resource->AddRequestHeader(name, value);
        break;
      case RESPONSE_HEADERS:
        resource->AddResponseHeader(name, value);
        break;
      default:
        DCHECK(false);
    }
  }
}

int InputPopulator::GetInt(cJSON* object, const char* key) {
  DCHECK(object != NULL && object->type == cJSON_Object);
  cJSON* value = cJSON_GetObjectItem(object, key);
  if (value != NULL && value->type == cJSON_Number) {
    return value->valueint;
  } else {
    INPUT_POPULATOR_ERROR() << '"' << key << "\" field must be a number.";
    return 0;
  }
}

const std::string InputPopulator::GetString(cJSON* object, const char* key) {
  DCHECK(object != NULL && object->type == cJSON_Object);
  cJSON* value = cJSON_GetObjectItem(object, key);
  if (value != NULL && value->type == cJSON_String) {
    return value->valuestring;
  } else {
    INPUT_POPULATOR_ERROR() << '"' << key << "\" field must be a string.";
    return "";
  }
}

}  // namespace

PagespeedInput* ParseHttpArchiveWithFilter(const std::string& har_data,
                                           ResourceFilter* resource_filter) {
  cJSON* har_json = cJSON_Parse(har_data.c_str());
  if (har_json == NULL) {
    delete resource_filter;
    return NULL;
  }

  PagespeedInput* input = (resource_filter == NULL ?
                           new PagespeedInput() :
                           new PagespeedInput(resource_filter));
  const bool ok = InputPopulator::Populate(har_json, input);

  cJSON_Delete(har_json);
  if (ok) {
    return input;
  } else {
    delete input;
    return NULL;
  }
}

PagespeedInput* ParseHttpArchive(const std::string& har_data) {
  return ParseHttpArchiveWithFilter(har_data, NULL);
}

// TODO: It would be nice to have a more robust ISO 8601 parser here, but this
// one seems to do okay for now on our unit tests.
bool Iso8601ToEpochMillis(const std::string& input, int64* output) {
  // We need to use unsigned ints, because otherwise sscanf() will look for +/-
  // characters, which we do not want to allow.
  unsigned int year, month, day, hours, minutes, seconds;
  char tail[21];  // The tail of the string, for milliseconds and timezone.
  // Parse the first six fields, and store the remainder of the string in tail.
  // Fail if we don't successfully parse all the fields.
  if (sscanf(input.c_str(), "%4u-%2u-%2uT%2u:%2u:%2u%20s",
             &year, &month, &day, &hours, &minutes, &seconds, tail) != 7) {
    return false;
  }
  // Fail if any of the fields so far are obviously out of range.
  if (month < 1 || month > 12 || day < 1 || day > 31 ||
      hours > 23 || minutes > 59 || seconds > 59) {
    return false;
  }

  // Get the fractional part of the seconds, if any.  This is sort of ugly,
  // because we have to interpret ".3" as ".300" and not ".003", so we can't
  // just use sscanf.  Also, there may be more digits than we want
  // (e.g. ".123456"), so this gracefully ignores the extra digits.  Of course,
  // because tail is of static size, we'll still fail if there are dozens of
  // digits of precision.  Oh, well.
  int milliseconds = 0;
  int index = 0;  // The current index into tail.
  if (tail[0] == '.') {
    int multiplier = 100;
    index = 1;
    while (IsAsciiDigit(tail[index])) {
      milliseconds += (tail[index] - '0') * multiplier;
      multiplier /= 10;
      ++index;
    }
  }
  const int microseconds = PR_USEC_PER_MSEC * milliseconds;

  // Now, index is pointing at the beginning of the timezone spec.  The
  // timezone should be "Z" for UTC, or something like e.g. "-05:00" for EST.
  int tz_offset_seconds = 0;
  DCHECK(index < static_cast<int>(arraysize(tail)));
  const char tz_sign = tail[index];
  if (tz_sign == 'Z') {
    // We're dealing with UTC.  Fail if the "Z" is not the last character of
    // the string.
    ++index;
    DCHECK(index < static_cast<int>(arraysize(tail)));
    if (tail[index] != '\0') {
      return false;
    }
  } else if (tz_sign == '+' || tz_sign == '-') {
    // We have a timezone offset.  Use sscanf to get the hours and minutes of
    // the offset.  The 'ignored' char is a hack to make sure that this is the
    // end of the string -- if sscanf doesn't parse exactly 2 out of the 3
    // format arguments, then we fail.
    unsigned int tz_hours, tz_minutes;
    char ignored;
    if (sscanf(tail + index + 1, "%2u:%2u%c",
               &tz_hours, &tz_minutes, &ignored) != 2) {
      return false;
    }
    tz_offset_seconds = ((tz_hours * 3600 + tz_minutes * 60) *
                         (tz_sign == '+' ? 1 : -1));
  } else {
    // The timezone is invalid, so fail.
    return false;
  }

  // Finally, use the prtime library to calculate the milliseconds since the
  // epoch UTC for this datetime.
  PRExplodedTime exploded = { microseconds, seconds, minutes, hours,
                              day, month - 1, year, 0, 0,
                              { tz_offset_seconds, 0 } };
  *output = PR_ImplodeTime(&exploded) / PR_USEC_PER_MSEC;
  return true;
}

}  // namespace pagespeed
