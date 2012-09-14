var child_process = require('child_process');
var system_commands = require('system_commands');

/**
 * commandExists checks if the command is on the system path.
 * If it is, it calls callback, otherwise it calls errback.
 *
 * @param  {String} command the command to check.
 * @param  {Function} callback called if the command is on the path.
 * @param  {Function} errback called if the command is not on the path.
 */
exports.commandExists = function(command, callback, errback)  {
  system_commands.set('command not found', 'bash: $0: command not found',
    'linux');
  system_commands.set('command not found', '\'$0\' is not recognized as an ' +
    'internal or external command, operable or batch file.', 'win32');

    child_process.exec(command, function(error, stdout, stderr) {
      if (error === system_commands.get('command not found'))
        errback();
      else
        callback();
    });
};
