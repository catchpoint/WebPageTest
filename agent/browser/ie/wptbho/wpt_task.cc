#include "StdAfx.h"
#include "wpt_task.h"
#include "json/json.h"

const char * ACTION_NAVIGATE = "navigate";
const char * ACTION_CLEAR_CACHE = "clearCache";

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

        if (action == ACTION_NAVIGATE)
          _action = NAVIGATE;
        else if (action == ACTION_CLEAR_CACHE)
          _action = CLEAR_CACHE;
        if (_action != UNDEFINED)
          _valid = true;
      }
    }
  }

  return _valid;
}
