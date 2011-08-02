goog.require('goog.debug');
goog.require('goog.debug.FancyWindow');
goog.require('goog.debug.Logger');

goog.provide('wpt.logging');

((function() {  // namespace

/**
 * Developers can set LOG_WINDOW_ to true to see a window with logs that show
 * commands and results.
 * @const
 * @type {boolean}
 */
wpt.logging.LOG_WINDOW_ = false;

/**
 * If the closure fancy debug window is enabled, this will be set to the
 * object controlling that window.  If the chrome console is used, this
 * will remain null.
 * @type {goog.debug.FancyWindow}
 */
wpt.logging.debugWindow_ = null;

/**
 * The current global logging object.
 * Use wpt.LOG.(error|warning|info)() to do logging.
 */
wpt.LOG = console;

/**
 * The console has method warn(), and not warnning().  To keep our code
 * consistent, always use warning(), and implement it using warn() if
 * nessisary.  The function LOG.waring is defined to be the result of
 * calling LOG.warn, with |this| set to |LOG|, with identical |arguments|.
 * param {...*} var_args
 */
wpt.LOG.warning = function(var_args) {
  wpt.LOG.warn.apply(wpt.LOG, arguments);
};

// If LOG_WINDOW is true, open a debug window at onload.
// Until onload, debug messages will go to the console.
if (wpt.logging.LOG_WINDOW_) {
  window.onload = function() {
    wpt.logging.delbugWindow_ = new goog.debug.FancyWindow('main');
    wpt.logging.debugWindow_.setEnabled(true);
    wpt.logging.debugWindow_.init();

    // Create a logger.
    wpt.LOG = goog.debug.Logger.getLogger('log');
  };
}

/**
 * If a logging window is open, close it.
 */
wpt.logging.closeWindowIfOpen = function() {
  if (wpt.logging.debugWindow_) {
    wpt.logging.debugWindow_.setEnabled(false);
    // Hack: We have no way to close the window without accessing the
    // private member |win_|.  Consider adding a public method that closes
    // the window to closure library.
    wpt.logging.debugWindow_.win_.close();
    wpt.logging.debugWindow_ = null;

    // Send any log messages to the console.
    wpt.LOG = console;
  }
};

})());  // namespace
