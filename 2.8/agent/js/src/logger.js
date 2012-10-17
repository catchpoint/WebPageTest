var jog = require('jog');
var log = jog(new jog.FileStore('./debug.log'));

var LOGLEVELS = {};
LOGLEVELS['emergency'] = 0;
LOGLEVELS['alert'] = 1;
LOGLEVELS['critical'] = 2;
LOGLEVELS['error'] = 3;
LOGLEVELS['warning'] = 4;
LOGLEVELS['notice'] = 5;
LOGLEVELS['info'] = 6;
LOGLEVELS['debug'] = process.env.WPT_DEBUG === 'true' ? -1 : 7;
LOGLEVELS['extra'] = 8;

/**
 * log is a wrapper for the visionmedia jog module that will:
 * a) automatically wrap strings in an object to get maximum info.
 * b) use jog.info because it stores the most information.
 * c) check for a WPT_VERBOSE environment variable and mirror logs to the
 *    console if it is true.
 * d) check for a WPT_MAX_LOGLEVEL environment variable and only log messages
 *    greater than or equal to the maximum log level.
 *
 * @param  {String} level the log level (can be grepped with jog command line).
 * @param  {Object/String} data an object or string (which will be converted to
 *                         an object) that will be logged.
*/
exports.log = function(level, data) {
  if (Object.keys(LOGLEVELS).indexOf(level) === -1)
    LOGLEVELS[level] = LOGLEVELS['debug'];

  var maxLogLevel = 5;
  if (!isNaN(parseInt(process.env.WPT_MAX_LOGLEVEL)))
    maxLogLevel = process.env.WPT_MAX_LOGLEVEL;
  else if (LOGLEVELS[process.env.WPT_MAX_LOGLEVEL])
    maxLogLevel = LOGLEVELS[process.env.WPT_MAX_LOGLEVEL];

  if (LOGLEVELS[level] <= maxLogLevel) {
    if (process.env.WPT_VERBOSE === 'true') {
      if (LOGLEVELS[level] <= LOGLEVELS['error'])
        var logconsole = console.error;
      else if (LOGLEVELS[level] <= LOGLEVELS['notice'])
        var logconsole = console.warn;
      else if (LOGLEVELS[level] == LOGLEVELS['info'])
        var logconsole = console.info;
      else
        var logconsole = console.log;
      logconsole(level + ': ' + JSON.stringify(data));
    }

    if (typeof data !== 'object')
      data = { data: data };
    log.info(level, data);
  }
};
