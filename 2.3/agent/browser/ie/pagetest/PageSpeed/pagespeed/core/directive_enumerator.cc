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

#include "base/logging.h"
#include "pagespeed/core/directive_enumerator.h"

namespace pagespeed {

DirectiveEnumerator::DirectiveEnumerator(const std::string& header)
    : header_(header),
      tok_(header_, ",; ="),
      state_(STATE_START) {
  tok_.set_quote_chars("\"");
  tok_.set_options(StringTokenizer::RETURN_DELIMS);
}

bool DirectiveEnumerator::CanTransition(State src, State dest) const {
  if (dest == STATE_ERROR) {
    return src != STATE_ERROR;
  }
  if (dest == STATE_DONE) {
    return src != STATE_ERROR && src != STATE_DONE;
  }
  switch (src) {
    case STATE_START:
      return dest == CONSUMED_KEY ||
          // Allow headers like "foo,,," or "foo,,,bar".
          dest == STATE_START;
    case CONSUMED_KEY:
      return dest == CONSUMED_EQ || dest == STATE_START;
    case CONSUMED_EQ:
      return dest == CONSUMED_VALUE ||
          // Allow headers like "foo==" or "foo==bar".
          dest == CONSUMED_EQ ||
          // Allow headers like "foo=," or "foo=,bar".
          dest == STATE_START;
    case CONSUMED_VALUE:
      return dest == STATE_START;
    case STATE_DONE:
      return false;
    case STATE_ERROR:
      return false;
    default:
      DCHECK(false);
      return false;
  }
}

bool DirectiveEnumerator::Transition(State dest) {
  if (!CanTransition(state_, dest)) {
    return false;
  }
  state_ = dest;
  return true;
}

bool DirectiveEnumerator::GetNext(std::string* key, std::string* value) {
  if (error() || done()) {
    return false;
  }

  if (state_ != STATE_START) {
    LOG(DFATAL) << "Unexpected state " << state_;
    Transition(STATE_ERROR);
    return false;
  }

  key->clear();
  value->clear();
  if (!GetNextInternal(key, value)) {
    Transition(STATE_ERROR);
    key->clear();
    value->clear();
    return false;
  }

  if (done()) {
    // Special case: if we're at end-of-stream, only return true if we
    // found a key. This covers cases where we get a header like
    // "foo,".
    return !key->empty();
  }

  return done() || Transition(STATE_START);
}

bool DirectiveEnumerator::GetNextInternal(std::string* key,
                                          std::string* value) {
  if (error() || done()) {
    LOG(DFATAL) << "Terminal state " << state_;
    return false;
  }

  if (!tok_.GetNext()) {
    // end-of-stream
    return Transition(STATE_DONE);
  }

  if (tok_.token_is_delim()) {
    if (!OnDelimiter(*tok_.token_begin())) {
      return false;
    }
    // Check to see if we've parsed a full directive. If so, return.
    if (!key->empty() && state_ == STATE_START) {
      return true;
    }
  } else {
    if (!OnToken(key, value)) {
      return false;
    }
  }

  return GetNextInternal(key, value);
}

bool DirectiveEnumerator::OnDelimiter(char c) {
  switch (c) {
    case ' ':
      // skip whitespace
      return true;
    case '=':
      return Transition(CONSUMED_EQ);
    case ',':
    case ';':
      return Transition(STATE_START);
    default:
      return false;
  }
}

bool DirectiveEnumerator::OnToken(std::string* key, std::string* value) {
  switch (state_) {
    case STATE_START:
      *key = tok_.token();
      if (key->find_first_of('\"') != key->npos) {
        // keys are not allowed to be quoted.
        return false;
      }
      return Transition(CONSUMED_KEY);
    case CONSUMED_EQ:
      *value = tok_.token();
      return Transition(CONSUMED_VALUE);
    default:
      return false;
  }
}

}  // namespace pagespeed
