#include "StdAfx.h"
#include "wpt_task.h"
#include "json/json.h"

const char * ACTION_BLOCK = "block";
const char * ACTION_CLEAR_CACHE = "clearCache";
const char * ACTION_CLICK = "click";
const char * ACTION_COLLECT_STATS = "collectStats";
const char * ACTION_EXEC = "exec";
const char * ACTION_EXPIRE_CACHE = "expireCache";
const char * ACTION_NAVIGATE = "navigate";
const char * ACTION_SET_COOKIE = "setCookie";
const char * ACTION_SET_DOM_ELEMENT = "setDomElement";
const char * ACTION_SET_INNER_HTML = "setInnerHTML";
const char * ACTION_SET_INNER_TEXT = "setInnerText";
const char * ACTION_SET_VALUE = "setValue";
const char * ACTION_SUBMIT_FORM = "submitForm";

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WptTask::WptTask(void) {
  Reset();
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WptTask::~WptTask(void) {
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WptTask::Reset() {
  _valid = false;
  _record = false;
  _action = UNDEFINED;
  _target.Empty();
  _value.Empty();
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool WptTask::ParseTask(CString task) {
  Reset();
  Json::Value root;
  Json::Reader reader;
  std::string document = CT2A(task);
  if (reader.parse(document, root)) {
    int code = 0;
    Json::Value value = root.get("statusCode", 0 );
    if (!value.empty() && value.isConvertibleTo(Json::intValue))
      code = value.asInt();
    if (code == 200) {
      const Json::Value data = root["data"];
      if (!data.empty() && data.isObject()) {
        Json::Value value = data.get("record", false );
        if (!value.empty() && value.isConvertibleTo(Json::booleanValue))
          _record = value.asBool();
        value = data.get("target", "" );
        if (!value.empty() && value.isConvertibleTo(Json::stringValue))
          _target = value.asCString();
        value = data.get("value", "" );
        if (!value.empty() && value.isConvertibleTo(Json::stringValue))
          _value = value.asCString();
        CStringA action;
        value = data.get("action", NULL );
        if (!value.empty() && value.isConvertibleTo(Json::stringValue))
          action = value.asCString();

        if (!action.CompareNoCase(ACTION_BLOCK))
          _action = BLOCK;
        else if (!action.CompareNoCase(ACTION_CLEAR_CACHE))
          _action = CLEAR_CACHE;
        else if (!action.CompareNoCase(ACTION_CLICK))
          _action = CLICK;
        else if (!action.CompareNoCase(ACTION_COLLECT_STATS))
          _action = COLLECT_STATS;
        else if (!action.CompareNoCase(ACTION_EXEC))
          _action = EXEC;
        else if (!action.CompareNoCase(ACTION_EXPIRE_CACHE))
          _action = EXPIRE_CACHE;
        else if (!action.CompareNoCase(ACTION_NAVIGATE))
          _action = NAVIGATE;
        else if (!action.CompareNoCase(ACTION_SET_COOKIE))
          _action = SET_COOKIE;
        else if (!action.CompareNoCase(ACTION_SET_DOM_ELEMENT))
          _action = SET_DOM_ELEMENT;
        else if (!action.CompareNoCase(ACTION_SET_INNER_HTML))
          _action = SET_INNER_HTML;
        else if (!action.CompareNoCase(ACTION_SET_INNER_TEXT))
          _action = SET_INNER_TEXT;
        else if (!action.CompareNoCase(ACTION_SET_VALUE))
          _action = SET_VALUE;
        else if (!action.CompareNoCase(ACTION_SUBMIT_FORM))
          _action = SUBMIT_FORM;

        if (_action != UNDEFINED)
          _valid = true;
      }
    }
  }

  return _valid;
}
